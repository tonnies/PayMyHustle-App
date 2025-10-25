-- PayMyHustle Database Schema
-- Migration to add recurring invoices functionality

-- Recurring invoices table (template for generating multiple invoices)
CREATE TABLE recurring_invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    number_of_recurrences INTEGER NOT NULL,
    start_date DATE NOT NULL,
    line_items TEXT NOT NULL, -- JSON array of line items
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    generated_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Add parent_recurring_invoice_id column to invoices table
ALTER TABLE invoices ADD COLUMN parent_recurring_invoice_id TEXT REFERENCES recurring_invoices(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_recurring_invoices_user_id ON recurring_invoices(user_id);
CREATE INDEX idx_recurring_invoices_company_id ON recurring_invoices(company_id);
CREATE INDEX idx_recurring_invoices_status ON recurring_invoices(status);
CREATE INDEX idx_invoices_parent_recurring ON invoices(parent_recurring_invoice_id);
