/**
 * In-memory session store for honeypot conversations and extracted intelligence.
 * Key: sessionId -> { conversationHistory, extractedIntelligence, messageCount, callbackSent }
 */

const sessions = new Map();

function defaultIntelligence() {
  return {
    bankAccounts: [],
    upiIds: [],
    phishingLinks: [],
    phoneNumbers: [],
    suspiciousKeywords: [],
  };
}

export function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      conversationHistory: [],
      extractedIntelligence: defaultIntelligence(),
      messageCount: 0,
      callbackSent: false,
      scamDetected: false,
    });
  }
  return sessions.get(sessionId);
}

export function appendToSession(sessionId, msg) {
  const session = getSession(sessionId);
  session.conversationHistory.push(msg);
  session.messageCount = session.conversationHistory.length;
}

export function mergeIntelligence(sessionId, intelligence) {
  const session = getSession(sessionId);
  const cur = session.extractedIntelligence;
  for (const [key, arr] of Object.entries(intelligence)) {
    if (Array.isArray(arr) && cur[key]) {
      for (const v of arr) {
        const s = String(v).trim();
        if (s && !cur[key].includes(s)) cur[key].push(s);
      }
    }
  }
}

export function markCallbackSent(sessionId) {
  getSession(sessionId).callbackSent = true;
}

export function wasCallbackSent(sessionId) {
  return getSession(sessionId).callbackSent;
}

export function setScamDetected(sessionId, value) {
  getSession(sessionId).scamDetected = value;
}
