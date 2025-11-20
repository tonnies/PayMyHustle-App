-- PayMyHustle Database Schema
-- Migration to add multiple banking details support

-- Add name and is_default fields to banking_details table
ALTER TABLE banking_details ADD COLUMN name TEXT;
ALTER TABLE banking_details ADD COLUMN is_default INTEGER DEFAULT 0;

-- Add banking_details_id to invoices table to track which banking details were used
ALTER TABLE invoices ADD COLUMN banking_details_id TEXT REFERENCES banking_details(id) ON DELETE SET NULL;

-- Create index for banking details lookup
CREATE INDEX idx_invoices_banking_details ON invoices(banking_details_id);

-- Update existing banking details to have a default name if name is null
UPDATE banking_details SET name = 'Primary Account' WHERE name IS NULL;

-- Set existing banking details as default if there's only one per user
UPDATE banking_details
SET is_default = 1
WHERE id IN (
    SELECT id FROM (
        SELECT id, user_id,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
        FROM banking_details
    ) WHERE rn = 1
);
