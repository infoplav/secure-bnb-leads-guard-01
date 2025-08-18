/**
 * Blurs the last 4 characters of a string with dots
 */
export const blurLastFourChars = (text: string): string => {
  if (!text || text.length <= 4) {
    return text;
  }
  
  const visiblePart = text.slice(0, -4);
  const blurredPart = '••••';
  
  return visiblePart + blurredPart;
};

/**
 * Blurs the last 4 digits of a phone number
 */
export const blurPhoneNumber = (phone: string): string => {
  if (!phone) return phone;
  return blurLastFourChars(phone);
};

/**
 * Blurs the last 4 characters of an email address (before the @)
 */
export const blurEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 4) {
    return email;
  }
  
  const visibleLocalPart = localPart.slice(0, -4);
  const blurredLocalPart = '••••';
  
  return `${visibleLocalPart}${blurredLocalPart}@${domain}`;
};