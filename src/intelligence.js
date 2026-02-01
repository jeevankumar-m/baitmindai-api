/**
 * Extract scam-related intelligence from conversation text.
 * Returns { bankAccounts, upiIds, phishingLinks, phoneNumbers, suspiciousKeywords }.
 */

const UPI_REGEX = /[\w.-]+@[\w.-]+|[\w.-]+@(paytm|phonepe|gpay|okaxis|ybl|axl|ibl)\b/gi;
const PHONE_REGEX = /\+?[\d\s-]{10,15}|\b\d{10}\b/g;
const URL_REGEX = /https?:\/\/[^\s"'<>]+/gi;
const BANK_ACCOUNT_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b|XXXX[\s-]?XXXX[\s-]?XXXX[\s-]?XXXX/gi;

const SUSPICIOUS_KEYWORDS = [
  'urgent', 'verify', 'account blocked', 'account suspended', 'verify immediately',
  'click here', 'otp', 'kyc', 'update now', 'reactivate', 'suspended', 'blocked',
  'pay now', 'upi id', 'share your', 'link below', 'confirm your', 'act now',
];

/**
 * @param {string} text
 * @returns {{ bankAccounts: string[], upiIds: string[], phishingLinks: string[], phoneNumbers: string[], suspiciousKeywords: string[] }}
 */
export function extractFromText(text) {
  if (!text || typeof text !== 'string') {
    return {
      bankAccounts: [],
      upiIds: [],
      phishingLinks: [],
      phoneNumbers: [],
      suspiciousKeywords: [],
    };
  }

  const t = text;
  const lower = t.toLowerCase();

  const bankAccounts = [...new Set((t.match(BANK_ACCOUNT_REGEX) || []).map((s) => s.replace(/\s/g, '')))];
  const upiIds = [...new Set((t.match(UPI_REGEX) || []).map((s) => s.trim()))];
  const phishingLinks = [...new Set((t.match(URL_REGEX) || []).map((s) => s.trim()))];
  const phoneNumbers = [...new Set((t.match(PHONE_REGEX) || []).map((s) => s.trim()).filter((s) => s.length >= 10))];

  const foundKeywords = SUSPICIOUS_KEYWORDS.filter((kw) => lower.includes(kw));
  const suspiciousKeywords = [...new Set(foundKeywords)];

  return {
    bankAccounts,
    upiIds,
    phishingLinks,
    phoneNumbers,
    suspiciousKeywords,
  };
}

/**
 * @param {{ sender: string, text: string }[]} conversationHistory
 * @param {{ text: string }} latestMessage
 * @returns {{ bankAccounts: string[], upiIds: string[], phishingLinks: string[], phoneNumbers: string[], suspiciousKeywords: string[] }}
 */
export function extractFromConversation(conversationHistory, latestMessage) {
  const allText = [
    ...conversationHistory.map((m) => m.text),
    latestMessage?.text || '',
  ].join(' ');
  return extractFromText(allText);
}
