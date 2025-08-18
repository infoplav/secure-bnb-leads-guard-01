-- Update Email3 template to use wallet variable
UPDATE email_templates 
SET content = REPLACE(content, 'unhappy library tuna basic exotic tip second debris prize lonely chuckle glue', '{{wallet}}'),
    variables = ARRAY['{{name}}'::text, '{{first_name}}'::text, '{{email}}'::text, '{{phone}}'::text, '{{wallet}}'::text],
    updated_at = now()
WHERE name = 'Email3';