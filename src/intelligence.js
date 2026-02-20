/**
 * Extract scam-related intelligence from conversation text (regex-only for speed).
 * Returns all evaluation fields: phoneNumbers, bankAccounts, upiIds, phishingLinks,
 * emailAddresses, caseIds, policyNumbers, orderNumbers, suspiciousKeywords.
 */

const UPI_REGEX = /[\w.-]+@[\w.-]+|[\w.-]+@(paytm|phonepe|gpay|okaxis|ybl|axl|ibl|upi)\b/gi;
const PHONE_REGEX = /\+?[\d\s-]{10,15}|\b\d{10}\b|(\+91[\s-]?\d{5}[\s-]?\d{5})/g;
const URL_REGEX = /https?:\/\/[^\s"'<>)\]]+/gi;
const BANK_ACCOUNT_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b|\b\d{12,18}\b/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const CASE_ID_REGEX = /\b(?:case|id|ref|reference)[\s#:-]*([A-Za-z0-9-]{4,20})\b|(?:SBI|ID)[\s-]*(\d{4,10})\b/gi;
const POLICY_REGEX = /\b(?:policy|policy no|policy number)[\s#:-]*([A-Za-z0-9-]{4,25})\b|\b\d{8,15}\b(?:[\s-]*(?:policy|ins))?/gi;
const ORDER_REGEX = /\b(?:order|order id|order no)[\s#:-]*([A-Za-z0-9-]{4,25})\b|\b(?:OD|ORD)[\s-]*\d{6,15}\b/gi;

const SUSPICIOUS_KEYWORDS = [
  'urgent', 'verify', 'account blocked', 'account suspended', 'verify immediately',
  'click here', 'otp', 'kyc', 'update now', 'reactivate', 'suspended', 'blocked',
  'pay now', 'upi id', 'share your', 'link below', 'confirm your', 'act now',
  'cashback', 'refund', 'lottery', 'winner', 'job offer', 'electricity', 'bill due',
  'govt scheme', 'crypto', 'investment', 'parcel', 'customs', 'tech support', 'loan approved',
  'income tax', 'refund', 'customer care', 'call back', 'link', 'payment failed',
].filter((v, i, a) => a.indexOf(v) === i);

function extractMatches(text, regex) {
  if (!text || typeof text !== 'string') return [];
  const m = text.match(regex);
  return [...new Set((m || []).map((s) => String(s).trim()).filter((s) => s.length > 0))];
}

function extractCaseLike(text) {
  const out = [];
  const caseLike = text.match(/\b(?:case|ref|reference|id)[\s#:-]*[A-Za-z0-9-]{4,20}\b/gi);
  if (caseLike) caseLike.forEach((s) => { const v = s.replace(/^(?:case|ref|reference|id)[\s#:-]*/i, '').trim(); if (v.length >= 4) out.push(v); });
  const numLike = text.match(/\b(?:SBI|ID)[\s-]*\d{4,10}\b/gi);
  if (numLike) numLike.forEach((s) => out.push(s.replace(/\s/g, '')));
  return [...new Set(out)];
}

function extractPolicyLike(text) {
  const out = [];
  const m = text.match(/\b(?:policy\s*(?:no|number|#)?[\s:-]*)?[A-Za-z0-9-]{8,20}\b/gi);
  if (m) m.forEach((s) => { const v = s.replace(/^(?:policy\s*(?:no|number|#)?[\s:-]*)/i, '').trim(); if (v.length >= 6 && /[0-9]/.test(v)) out.push(v); });
  return [...new Set(out)];
}

function extractOrderLike(text) {
  const out = [];
  const m = text.match(/\b(?:order\s*(?:id|no|number|#)?[\s:-]*)?[A-Za-z0-9-]{6,20}\b/gi);
  if (m) m.forEach((s) => { const v = s.replace(/^(?:order\s*(?:id|no|number|#)?[\s:-]*)/i, '').trim(); if (v.length >= 6) out.push(v); });
  return [...new Set(out)];
}

/**
 * @param {string} text
 * @returns {object} All extraction fields per evaluation spec
 */
export function extractFromText(text) {
  if (!text || typeof text !== 'string') {
    return {
      bankAccounts: [], upiIds: [], phishingLinks: [], phoneNumbers: [],
      emailAddresses: [], caseIds: [], policyNumbers: [], orderNumbers: [],
      suspiciousKeywords: [],
    };
  }

  const t = text;
  const lower = t.toLowerCase();

  const bankAccounts = [...new Set((t.match(BANK_ACCOUNT_REGEX) || []).map((s) => s.replace(/\s/g, '')).filter((s) => s.length >= 12))];
  const upiIds = [...new Set((t.match(UPI_REGEX) || []).map((s) => s.trim()))];
  const phishingLinks = [...new Set((t.match(URL_REGEX) || []).map((s) => s.trim()))];
  const phoneNumbers = [...new Set((t.match(PHONE_REGEX) || []).map((s) => s.replace(/\s/g, '').trim()).filter((s) => s.length >= 10))];
  const emailAddresses = extractMatches(t, EMAIL_REGEX);
  const caseIds = extractCaseLike(t);
  const policyNumbers = extractPolicyLike(t);
  const orderNumbers = extractOrderLike(t);
  const foundKeywords = SUSPICIOUS_KEYWORDS.filter((kw) => lower.includes(kw));
  const suspiciousKeywords = [...new Set(foundKeywords)];

  return {
    bankAccounts, upiIds, phishingLinks, phoneNumbers,
    emailAddresses, caseIds, policyNumbers, orderNumbers,
    suspiciousKeywords,
  };
}

/**
 * @param {{ sender: string, text: string }[]} conversationHistory
 * @param {{ text: string }} latestMessage
 * @returns {object} All extraction fields
 */
export function extractFromConversation(conversationHistory, latestMessage) {
  const allText = [
    ...(conversationHistory || []).map((m) => m.text),
    (latestMessage && latestMessage.text) || '',
  ].join(' ');
  return extractFromText(allText);
}
