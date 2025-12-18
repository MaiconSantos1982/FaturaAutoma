-- Add soft delete columns to invoices table
-- Run this in your Supabase SQL Editor

-- Add deleted_at column
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add deleted_by column (references who deleted)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Add deletion_reason column
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for faster queries on deleted status
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status_deleted ON invoices(status) WHERE status = 'deleted';

-- Comment for documentation
COMMENT ON COLUMN invoices.deleted_at IS 'Timestamp when the invoice was soft deleted';
COMMENT ON COLUMN invoices.deleted_by IS 'User ID who deleted the invoice';
COMMENT ON COLUMN invoices.deletion_reason IS 'Reason provided for deletion';
