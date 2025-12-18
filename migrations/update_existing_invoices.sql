-- Script to update existing invoices with assigned approver
-- Run this in your Supabase SQL Editor AFTER running add_approval_tracking.sql

-- Update invoices that are pending and don't have an assigned approver
DO $$
DECLARE
    inv RECORD;
    rule RECORD;
BEGIN
    FOR inv IN 
        SELECT i.id, i.company_id, i.total_amount 
        FROM invoices i 
        WHERE i.approval_status = 'pending' 
        AND i.assigned_approver_id IS NULL
    LOOP
        -- Find the applicable approval rule
        SELECT * INTO rule
        FROM approval_rules ar
        WHERE ar.company_id = inv.company_id
        AND ar.is_active = true
        AND ar.min_amount <= inv.total_amount
        AND (ar.max_amount IS NULL OR ar.max_amount >= inv.total_amount)
        ORDER BY ar.approval_level ASC
        LIMIT 1;
        
        IF rule IS NOT NULL THEN
            UPDATE invoices 
            SET assigned_approver_id = rule.approver_id,
                approval_level = rule.approval_level
            WHERE id = inv.id;
        END IF;
    END LOOP;
END $$;

-- also update completed invoices status for those already approved
UPDATE invoices
SET status = 'completed'
WHERE approval_status IN ('approved', 'auto_approved')
AND status = 'pending';

-- Show results
SELECT 
    id, 
    invoice_number, 
    total_amount, 
    approval_level, 
    assigned_approver_id,
    (SELECT name FROM users WHERE id = invoices.assigned_approver_id) as assigned_approver_name
FROM invoices 
WHERE approval_status = 'pending'
ORDER BY created_at DESC;
