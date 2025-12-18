// Database Types - Matching Supabase Schema
export type UserRole = 'super_admin' | 'master' | 'user';
export type InvoiceStatus = 'pending_extraction' | 'pending' | 'processing' | 'completed' | 'error';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';
export type DocumentType = 'nota_fiscal' | 'boleto' | 'fatura' | 'outro';

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  auto_approve_limit: number;
  default_debit_account?: string;
  default_credit_account?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface Invoice {
  id: string;
  company_id: string;
  supplier_name?: string;
  supplier_cnpj?: string;
  invoice_number: string;
  invoice_series?: string;
  invoice_date?: string;
  due_date?: string;
  total_amount: number;
  tax_amount?: number;
  discount_amount?: number;
  description?: string;
  po_number?: string;
  status: InvoiceStatus;
  variance_detected?: boolean;
  variance_description?: string;
  approval_status: ApprovalStatus;
  approver_id?: string;
  approved_at?: string;
  approval_notes?: string;
  debit_account_code?: string;
  credit_account_code?: string;
  original_file_url?: string;
  file_type?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  approver?: User;
}

export interface ApprovalRule {
  id: string;
  company_id: string;
  approval_level: number;
  min_amount: number;
  max_amount?: number;
  department_codes?: string[];
  auto_approve: boolean;
  approver_id?: string;
  escalation_approver_id?: string;
  approval_deadline_hours?: number;
  priority?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  approver?: User;
}

export interface Notification {
  id: string;
  company_id: string;
  user_id: string;
  invoice_id?: string;
  type: string;
  title: string;
  message?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id?: string;
  invoice_id?: string;
  action: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

export interface AccountingEntry {
  id: string;
  company_id: string;
  invoice_id?: string;
  debit_account_code: string;
  debit_amount: number;
  credit_account_code: string;
  credit_amount: number;
  entry_date: string;
  erp_status: string;
  erp_id?: string;
  created_at: string;
  created_by?: string;
}

export interface ExtractionLog {
  id: string;
  company_id?: string;
  file_path?: string;
  file_type?: string;
  extraction_status: string;
  raw_response?: Record<string, unknown>;
  parsed_data?: Record<string, unknown>;
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  processed: number;
  pending: number;
  rejected: number;
  totalAmount: number;
}

// Filter types
export interface InvoiceFilters {
  status?: InvoiceStatus;
  approval_status?: ApprovalStatus;
  startDate?: string;
  endDate?: string;
  supplier?: string;
}

// Auth types
export interface AuthState {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
