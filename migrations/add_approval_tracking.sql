-- Add approval tracking columns to invoices table
-- Run this in your Supabase SQL Editor

-- Add approval_level column (to track which rule was applied)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS approval_level INTEGER;

-- Add assigned_approver_id column (the approver designated by the rule)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS assigned_approver_id UUID REFERENCES users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_assigned_approver ON invoices(assigned_approver_id);
CREATE INDEX IF NOT EXISTS idx_invoices_approval_level ON invoices(approval_level);

-- Comment for documentation
COMMENT ON COLUMN invoices.approval_level IS 'Approval level applied based on invoice amount';
COMMENT ON COLUMN invoices.assigned_approver_id IS 'User ID assigned to approve based on approval rules';
