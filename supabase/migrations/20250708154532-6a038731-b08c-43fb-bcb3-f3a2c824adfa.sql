-- Add email bounce tracking to email_logs table
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bounce_reason TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bounce_at TIMESTAMP WITH TIME ZONE;

-- Update user_leads table to store balance errors
ALTER TABLE user_leads ADD COLUMN IF NOT EXISTS balance_error TEXT;

-- Create index for bounce tracking
CREATE INDEX IF NOT EXISTS idx_email_logs_bounce_at ON email_logs(bounce_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_bounce_count ON email_logs(bounce_count);