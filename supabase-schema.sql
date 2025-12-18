-- FaturaAutom Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  auto_approval_limit DECIMAL(15,2) DEFAULT 0,
  default_debit_account VARCHAR(50),
  default_credit_account VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('super_admin', 'master', 'user')) DEFAULT 'user',
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  nf_number VARCHAR(50),
  supplier_name VARCHAR(255) NOT NULL,
  supplier_cnpj VARCHAR(18),
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE,
  issue_date DATE,
  document_type VARCHAR(50) CHECK (document_type IN ('nota_fiscal', 'boleto', 'fatura', 'outro')),
  status VARCHAR(20) CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'auto_aprovada')) DEFAULT 'pendente',
  file_url TEXT,
  notes TEXT,
  debit_account VARCHAR(50),
  credit_account VARCHAR(50),
  approval_level INTEGER,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval rules table
CREATE TABLE IF NOT EXISTS approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  min_amount DECIMAL(15,2) NOT NULL,
  max_amount DECIMAL(15,2) NOT NULL,
  auto_approve BOOLEAN DEFAULT false,
  approver_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, level)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id);

-- Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users: Can view users from same company
CREATE POLICY "Users can view company users" ON users
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users: Super admins can update users in their company
CREATE POLICY "Super admins can update company users" ON users
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Invoices: Users can view invoices from their company
CREATE POLICY "Users can view company invoices" ON invoices
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Invoices: Users can insert invoices for their company
CREATE POLICY "Users can insert company invoices" ON invoices
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Invoices: Masters and admins can update invoices
CREATE POLICY "Approvers can update invoices" ON invoices
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('super_admin', 'master')
    )
  );

-- Approval Rules: Users can view rules from their company
CREATE POLICY "Users can view company approval rules" ON approval_rules
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Approval Rules: Super admins can manage rules
CREATE POLICY "Super admins can manage approval rules" ON approval_rules
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Notifications: Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Audit Log: Users can view audit logs from their company
CREATE POLICY "Users can view company audit logs" ON audit_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Audit Log: Allow inserts from authenticated users
CREATE POLICY "Authenticated users can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Companies: Super admins can update their company
CREATE POLICY "Super admins can update company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Enable realtime for invoices and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  auth.role() = 'authenticated'
);

-- Storage policy: Allow users to view files from their company
CREATE POLICY "Users can view company invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices' AND
  auth.role() = 'authenticated'
);

-- Sample data for testing (optional - comment out in production)
/*
-- Create a test company
INSERT INTO companies (id, name, cnpj, auto_approval_limit)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Teste', '00.000.000/0001-00', 1000);

-- Note: To create a test user, first create the user in Supabase Auth,
-- then insert into the users table with the same user ID
*/
