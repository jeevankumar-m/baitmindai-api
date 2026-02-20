/**
 * Scam intent classifier. Only classifies as scam after a certain degree of conversation
 * (at least 2 total messages). First message alone: we engage agent (potential scam).
 */

import { chat } from './lib/gemini.js';

const MIN_MESSAGES_FOR_SCAM_CHECK = 2;

/**
 * @param {{ text: string }[]} conversationHistory
 * @param {{ text: string }} message
 * @returns {Promise<boolean>} true = scam intent detected, false = not scam
 */
export async function isScamIntent(conversationHistory, message) {
  const allTexts = [...conversationHistory.map((m) => m.text), message.text];
  const totalMessages = allTexts.length;

  // Only classify after sufficient conversation; otherwise treat as potential scam and engage
  if (totalMessages < MIN_MESSAGES_FOR_SCAM_CHECK) {
    return true; // engage agent on first message
  }

  const conversation = allTexts.map((t, i) => `Message ${i + 1}: ${t}`).join('\n');

  const systemPrompt = `You are a scam classifier. Given a short conversation, output ONLY one word: SCAM or NOT_SCAM.
SCAM = fraud intent in any form: bank/account block, OTP/verification, UPI/cashback/payment, phishing links, KYC update, fake job/lottery/refund/loan, electricity/govt/crypto/customs/tech support/income tax scams, urgency, asking for money or credentials.
NOT_SCAM = normal chat or clearly no fraud intent.
If in doubt or too little context, answer SCAM so the system keeps engaging.`;

  const userPrompt = `Conversation:\n${conversation}\n\nOne word (SCAM or NOT_SCAM):`;

  try {
    const reply = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { max_tokens: 10, temperature: 0 }
    );
    const normalized = (reply || '').toUpperCase().trim();
    return normalized.includes('SCAM') && !normalized.includes('NOT_SCAM');
  } catch (err) {
    console.error('Scam detection error:', err.message);
    return true; // on error, engage agent
  }
}
