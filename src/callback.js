/**
 * GUVI callback client. POSTs final result to evaluation endpoint.
 * Only sends when SEND_GUVI_CALLBACK=true (do not send during testing).
 */

const DEFAULT_URL = 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult';

/**
 * @param {object} payload
 * @param {string} payload.sessionId
 * @param {boolean} payload.scamDetected
 * @param {number} payload.totalMessagesExchanged
 * @param {object} payload.extractedIntelligence
 * @param {string[]} payload.extractedIntelligence.bankAccounts
 * @param {string[]} payload.extractedIntelligence.upiIds
 * @param {string[]} payload.extractedIntelligence.phishingLinks
 * @param {string[]} payload.extractedIntelligence.phoneNumbers
 * @param {string[]} payload.extractedIntelligence.suspiciousKeywords
 * @param {string} payload.agentNotes
 */
export async function sendGuviCallback(payload) {
  const enabled = process.env.SEND_GUVI_CALLBACK === 'true';
  if (!enabled) {
    console.log('[Callback] SEND_GUVI_CALLBACK is false; skipping GUVI callback');
    return;
  }

  const url = process.env.GUVI_CALLBACK_URL || DEFAULT_URL;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error('[Callback] GUVI error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[Callback] Failed to POST to GUVI:', err.message);
  }
}

/**
 * Fire-and-forget: do not await. Does not block API response.
 */
export function sendGuviCallbackAsync(payload) {
  setImmediate(() => {
    sendGuviCallback(payload).catch((e) => console.error('[Callback]', e));
  });
}
