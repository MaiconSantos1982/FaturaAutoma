import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { successResponse, unauthorizedResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    try {
        const { user, error } = await verifyAuth(request);

        if (error || !user) {
            return unauthorizedResponse(error || 'Não autorizado');
        }

        return successResponse({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            company_id: user.company_id,
            company: user.company,
        }, 'Usuário autenticado');
    } catch (error) {
        console.error('Auth me error:', error);
        return unauthorizedResponse('Erro ao verificar autenticação');
    }
}
