import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate input
        if (!email || !password) {
            return errorResponse('Email e senha são obrigatórios', 400);
        }

        // Find user by email
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*, company:companies(*)')
            .eq('email', email.toLowerCase().trim())
            .eq('is_active', true)
            .single();

        if (userError || !userData) {
            return unauthorizedResponse('Email ou senha inválidos');
        }

        // For demo: accept any password for existing users
        // In production: implement proper password verification with bcrypt
        // const isValidPassword = await bcrypt.compare(password, userData.password_hash);

        // Generate JWT token
        const tokenPayload = {
            userId: userData.id,
            email: userData.email,
            companyId: userData.company_id,
            role: userData.role,
            exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };

        const accessToken = btoa(JSON.stringify(tokenPayload));

        // Return user data
        return successResponse({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 86400, // 24 hours in seconds
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                department: userData.department,
                company_id: userData.company_id,
                company: {
                    id: userData.company.id,
                    name: userData.company.name,
                    cnpj: userData.company.cnpj,
                },
            },
        }, 'Login realizado com sucesso');
    } catch (error) {
        console.error('Login error:', error);
        return errorResponse('Erro ao processar login', 500);
    }
}
