import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
} from '@/lib/api-response';

// POST /api/invoices/upload-manual - Upload and process invoice
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const documentType = formData.get('document_type') as string || 'pdf';

        if (!file) {
            return errorResponse('Arquivo é obrigatório', 400);
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'text/xml', 'application/xml', 'image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            return errorResponse('Tipo de arquivo não suportado. Use PDF, XML, PNG ou JPEG.', 400);
        }

        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        const fileName = `${user.company_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const fileBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return errorResponse('Erro ao fazer upload do arquivo', 500);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('invoices')
            .getPublicUrl(fileName);

        const fileUrl = urlData.publicUrl;

        // Log extraction start
        const { data: extractionLog } = await supabase
            .from('extraction_logs')
            .insert({
                company_id: user.company_id,
                file_path: fileName,
                file_type: fileExt,
                extraction_status: 'processing',
            })
            .select()
            .single();

        // Call n8n webhook for extraction (if configured)
        let extractionData = null;
        const n8nWebhookUrl = process.env.N8N_EXTRACTION_WEBHOOK_URL;

        if (n8nWebhookUrl) {
            try {
                const startTime = Date.now();
                const webhookResponse = await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        file_url: fileUrl,
                        file_type: fileExt,
                        company_id: user.company_id,
                        user_id: user.id,
                    }),
                });

                if (webhookResponse.ok) {
                    extractionData = await webhookResponse.json();

                    // Update extraction log
                    if (extractionLog) {
                        await supabase
                            .from('extraction_logs')
                            .update({
                                extraction_status: 'completed',
                                parsed_data: extractionData,
                                processing_time_ms: Date.now() - startTime,
                            })
                            .eq('id', extractionLog.id);
                    }
                } else {
                    // Log extraction failure
                    if (extractionLog) {
                        await supabase
                            .from('extraction_logs')
                            .update({
                                extraction_status: 'error',
                                error_message: `Webhook returned status ${webhookResponse.status}`,
                            })
                            .eq('id', extractionLog.id);
                    }
                }
            } catch (webhookError) {
                console.error('Webhook error:', webhookError);
                // Continue without extraction data
                if (extractionLog) {
                    await supabase
                        .from('extraction_logs')
                        .update({
                            extraction_status: 'error',
                            error_message: String(webhookError),
                        })
                        .eq('id', extractionLog.id);
                }
            }
        }

        // Get company config for auto-approval check
        const { data: company } = await supabase
            .from('companies')
            .select('auto_approve_limit, default_debit_account, default_credit_account')
            .eq('id', user.company_id)
            .single();

        // Create invoice from extraction data or with pending status
        const invoiceData: Record<string, unknown> = {
            company_id: user.company_id,
            invoice_number: extractionData?.invoice_number || `TEMP-${Date.now()}`,
            invoice_series: extractionData?.invoice_series || null,
            supplier_name: extractionData?.supplier_name || 'Pendente de Extração',
            supplier_cnpj: extractionData?.supplier_cnpj || null,
            total_amount: extractionData?.total_amount || 0,
            tax_amount: extractionData?.tax_amount || 0,
            due_date: extractionData?.due_date || null,
            invoice_date: extractionData?.invoice_date || null,
            description: extractionData?.description || null,
            file_type: fileExt,
            original_file_url: fileUrl,
            status: extractionData ? 'pending' : 'pending_extraction',
            approval_status: 'pending',
            debit_account_code: company?.default_debit_account || null,
            credit_account_code: company?.default_credit_account || null,
            created_by: user.id,
        };

        // Check auto-approval and find assigned approver if we have extraction data
        if (extractionData?.total_amount) {
            const amount = parseFloat(extractionData.total_amount);
            const autoApproveLimit = company?.auto_approve_limit || 0;

            if (amount <= autoApproveLimit) {
                invoiceData.approval_status = 'auto_approved';
                invoiceData.status = 'completed';
            } else {
                // Find assigned approver based on approval rules
                const { data: rules } = await supabase
                    .from('approval_rules')
                    .select('*')
                    .eq('company_id', user.company_id)
                    .eq('is_active', true)
                    .lte('min_amount', amount)
                    .or(`max_amount.gte.${amount},max_amount.is.null`)
                    .order('approval_level', { ascending: true })
                    .limit(1);

                if (rules && rules.length > 0) {
                    invoiceData.assigned_approver_id = rules[0].approver_id || null;
                    invoiceData.approval_level = rules[0].approval_level;
                }
            }
        }

        const { data: invoice, error: insertError } = await supabase
            .from('invoices')
            .insert(invoiceData)
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return errorResponse('Erro ao criar fatura', 500);
        }

        // Create audit log
        await supabase.from('audit_log').insert({
            company_id: user.company_id,
            user_id: user.id,
            invoice_id: invoice.id,
            action: 'upload_invoice',
            new_values: { file_name: file.name, file_type: fileExt },
        });

        return successResponse({
            invoice_id: invoice.id,
            extraction_data: extractionData,
            extraction_status: extractionData ? 'completed' : 'pending',
            next_action: extractionData
                ? (invoiceData.approval_status === 'auto_approved' ? 'completed' : 'pending_approval')
                : 'manual_entry',
        }, extractionData
            ? 'Arquivo processado com sucesso'
            : 'Arquivo enviado. Preencha os dados manualmente.',
            201);
    } catch (error) {
        console.error('Upload error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
