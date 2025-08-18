-- Update all email templates to include wallet variable
UPDATE email_templates 
SET variables = ARRAY['{{name}}'::text, '{{first_name}}'::text, '{{email}}'::text, '{{phone}}'::text, '{{wallet}}'::text, '{{current_ip}}'::text, '{{link}}'::text, '{{home_link}}'::text, '{{current_time_minus_10}}'::text],
    updated_at = now()
WHERE name IN ('EMAIL 1', 'EMAIL 2', 'Email 3');

-- Also update Email1 and Email2 names to be consistent
UPDATE email_templates SET name = 'Email1' WHERE name = 'EMAIL 1';
UPDATE email_templates SET name = 'Email2' WHERE name = 'EMAIL 2';