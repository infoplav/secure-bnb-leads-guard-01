import { translations } from './translations';

export const getEmailTemplate = (templateNumber: 1 | 2 | 3 | 4 | 'trustWallet', language: string = 'fr', variables: Record<string, string> = {}) => {
  const lang = translations[language] || translations.fr;
  const templateKey = typeof templateNumber === 'number' ? `template${templateNumber}` : templateNumber;
  const template = lang.emailTemplates?.[templateKey];
  
  if (!template || typeof template !== 'object' || !('subject' in template) || !('content' in template)) {
    // Fallback to French if template not found
    const frTemplate = translations.fr.emailTemplates[templateKey];
    return {
      subject: replaceVariables(frTemplate.subject as string, variables),
      content: replaceVariables(frTemplate.content as string, variables)
    };
  }

  return {
    subject: replaceVariables(template.subject as string, variables),
    content: replaceVariables(template.content as string, variables)
  };
};

const replaceVariables = (text: string, variables: Record<string, string>): string => {
  let result = text;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
};