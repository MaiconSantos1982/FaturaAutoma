import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
} from '@/lib/api-response';

// GET /api/dashboard/metrics - Get dashboard KPIs
export async function GET(request: NextRequest) {
    try {
        const { user, error: authError } = await verifyAuth(request);
        if (authError || !user) {
            return unauthorizedResponse(authError || 'Não autorizado');
        }

        // Get all invoices for company
        const { data: invoices, error: queryError } = await supabase
            .from('invoices')
            .select('approval_status, total_amount, status')
            .eq('company_id', user.company_id);

        if (queryError) {
            console.error('Query error:', queryError);
            return errorResponse('Erro ao buscar métricas', 500);
        }

        // Calculate metrics
        let totalProcessed = 0;
        let pendingApproval = 0;
        let rejected = 0;
        let autoApproved = 0;
        let totalValue = 0;
        let approvedValue = 0;

        for (const invoice of invoices || []) {
            const amount = parseFloat(invoice.total_amount) || 0;

            switch (invoice.approval_status) {
                case 'approved':
                    totalProcessed++;
                    approvedValue += amount;
                    break;
                case 'auto_approved':
                    totalProcessed++;
                    autoApproved++;
                    approvedValue += amount;
                    break;
                case 'pending':
                    pendingApproval++;
                    break;
                case 'rejected':
                    rejected++;
                    break;
            }

            totalValue += amount;
        }

        const totalInvoices = invoices?.length || 0;
        const approvalRate = totalInvoices > 0
            ? ((totalProcessed / totalInvoices) * 100).toFixed(1)
            : '0.0';

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentInvoices } = await supabase
            .from('invoices')
            .select('id')
            .eq('company_id', user.company_id)
            .gte('created_at', sevenDaysAgo.toISOString());

        const recentCount = recentInvoices?.length || 0;

        // Get pending approvals assigned to current user (if approver)
        let myPendingApprovals = 0;
        if (user.role === 'super_admin' || user.role === 'master') {
            const { data: myPending } = await supabase
                .from('invoices')
                .select('id')
                .eq('company_id', user.company_id)
                .eq('approval_status', 'pending');

            myPendingApprovals = myPending?.length || 0;
        }

        return successResponse({
            metrics: {
                total_invoices: totalInvoices,
                total_processed: totalProcessed,
                pending_approval: pendingApproval,
                rejected,
                auto_approved: autoApproved,
                total_value: totalValue,
                approved_value: approvedValue,
                approval_rate: parseFloat(approvalRate),
                recent_7_days: recentCount,
                my_pending_approvals: myPendingApprovals,
            },
        }, 'Métricas carregadas');
    } catch (error) {
        console.error('Get metrics error:', error);
        return errorResponse('Erro interno do servidor', 500);
    }
}
