import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response';

// Config removida para compatibilidade com Next.js App Router

const WEBHOOK_URL = 'https://webhook.superadesafio.com.br/webhook/f1763123-1807-4e7b-87db-1f1ac457ca9c';
const BUCKET_NAME = 'Fatura';

export async function POST(request: NextRequest) {
    try {
        // 1. Verificar Autenticação
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // 2. Parse do FormData
        const formData = await request.formData();
        const file = formData.get('file') as File;

        // Se o company_id não vier no form, usa o do usuário autenticado (recomendado)
        const companyId = (formData.get('company_id') as string) || user.company_id;
        const userId = (formData.get('user_id') as string) || user.id;

        if (!file) {
            return errorResponse('Arquivo não fornecido', 400);
        }

        // 3. Upload para Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${companyId}/invoices/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        console.log('Tentando upload:', { fileName, bucket: BUCKET_NAME, fileSize: file.size, fileType: file.type });

        // Converter File para ArrayBuffer para upload via servidor
        const fileBuffer = await file.arrayBuffer();

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, fileBuffer, {
                contentType: file.type || 'application/pdf',
                upsert: false
            });

        if (uploadError) {
            console.error('Erro detalhado no upload:', {
                message: uploadError.message,
                name: uploadError.name,
                error: uploadError
            });
            return errorResponse(`Falha no upload: ${uploadError.message}`, 500);
        }

        console.log('Upload bem-sucedido:', uploadData);

        // 4. Obter URL Pública
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // 5. Chamar Webhook do n8n
        // Collect optional invoice data if provided
        const invoiceData: Record<string, unknown> = {};
        if (formData.get('invoice_number')) invoiceData.invoice_number = formData.get('invoice_number');
        if (formData.get('supplier_name')) invoiceData.supplier_name = formData.get('supplier_name');
        if (formData.get('supplier_cnpj')) invoiceData.supplier_cnpj = formData.get('supplier_cnpj');
        if (formData.get('total_amount')) invoiceData.total_amount = formData.get('total_amount');
        if (formData.get('invoice_date')) invoiceData.invoice_date = formData.get('invoice_date');
        if (formData.get('due_date')) invoiceData.due_date = formData.get('due_date');
        if (formData.get('description')) invoiceData.description = formData.get('description');

        const webhookPayload = {
            file_url: publicUrl,
            file_type: 'pdf',
            company_id: companyId,
            user_id: userId,
            invoice_data: Object.keys(invoiceData).length > 0 ? invoiceData : undefined
        };

        console.log('Enviando para webhook:', webhookPayload);

        const webhookResponse = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
            console.error('Erro no webhook n8n:', await webhookResponse.text());
            // Opcional: Retornar erro ou sucesso parcial. Aqui retornarei erro para o front saber.
            return errorResponse('Arquivo salvo, mas falha ao iniciar processamento', 502);
        }

        // 6. Retornar Sucesso
        return successResponse({
            file_url: publicUrl,
            process_started: true
        }, 'Arquivo enviado para o bucket e processamento iniciado');

    } catch (error) {
        console.error('Erro interno:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
