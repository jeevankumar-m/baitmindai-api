/**
 * BaitmindAI – Agentic Honey-Pot API
 * POST /api/message: accept message, detect scam, run agent, extract intelligence, return { status, reply }.
 */

import 'dotenv/config';
import express from 'express';
import { apiKeyAuth } from './middleware/auth.js';
import { getSession, appendToSession, mergeIntelligence, markCallbackSent, wasCallbackSent, setScamDetected } from './sessionStore.js';
import { isScamIntent } from './scamDetector.js';
import { generateReply } from './agent.js';
import { extractFromConversation } from './intelligence.js';
import { isEngagementComplete } from './completion.js';
import { sendGuviCallbackAsync } from './callback.js';

const app = express();
app.use(express.json());

function jsonReply(res, status, reply) {
  const payload = {
    status: status === 'error' ? 'error' : 'success',
    reply: typeof reply === 'string' ? reply : 'Something went wrong.',
  };
  console.log('[Response]', JSON.stringify(payload, null, 2));
  return res.status(status === 'error' ? (res.statusCode >= 400 ? res.statusCode : 500) : 200).json(payload);
}

function validateBody(body) {
  if (!body || typeof body !== 'object') return 'Missing or invalid body';
  if (!body.sessionId || typeof body.sessionId !== 'string') return 'Missing or invalid sessionId';
  if (!body.message || typeof body.message !== 'object') return 'Missing or invalid message';
  if (typeof body.message.text !== 'string') return 'Missing or invalid message.text';
  if (!Array.isArray(body.conversationHistory)) return 'conversationHistory must be an array';
  return null;
}

app.post('/api/message', apiKeyAuth, async (req, res) => {
  console.log('[Request]', JSON.stringify(req.body, null, 2));

  const err = validateBody(req.body);
  if (err) {
    res.status(400);
    return jsonReply(res, 'error', err);
  }

  const { sessionId, message, conversationHistory, metadata } = req.body;
  const fullHistory = [...(conversationHistory || []), message];

  try {
    const scamDetected = await isScamIntent(conversationHistory || [], message);
    if (!scamDetected) {
      return jsonReply(res, 'success', 'I am not interested. Please do not contact me again.');
    }

    setScamDetected(sessionId, true);
    const session = getSession(sessionId);
    session.conversationHistory = [...(conversationHistory || []), message];
    session.messageCount = session.conversationHistory.length;

    const reply = await generateReply(conversationHistory || [], message);

    const userMsg = {
      sender: 'user',
      text: reply,
      timestamp: message.timestamp || new Date().toISOString(),
    };
    appendToSession(sessionId, userMsg);

    const final = getSession(sessionId);
    const extracted = extractFromConversation(final.conversationHistory, { text: '' });
    mergeIntelligence(sessionId, extracted);

    const totalMessages = final.messageCount;

    if (
      isEngagementComplete(totalMessages, final.extractedIntelligence) &&
      !wasCallbackSent(sessionId)
    ) {
      markCallbackSent(sessionId);
      const agentNotes =
        'Scammer engaged; extracted ' +
        [
          final.extractedIntelligence.bankAccounts.length && 'bank accounts',
          final.extractedIntelligence.upiIds.length && 'UPI IDs',
          final.extractedIntelligence.phishingLinks.length && 'links',
          final.extractedIntelligence.phoneNumbers.length && 'phone numbers',
        ]
          .filter(Boolean)
          .join(', ') ||
        'conversation intelligence';
      const callbackPayload = {
        sessionId,
        scamDetected: true,
        totalMessagesExchanged: totalMessages,
        extractedIntelligence: final.extractedIntelligence,
        agentNotes,
      };
      console.log('\n#### PAYLOAD ###\n' + JSON.stringify(callbackPayload, null, 2) + '\n');
      sendGuviCallbackAsync(callbackPayload);
    }

    return jsonReply(res, 'success', reply);
  } catch (e) {
    console.error('Handler error:', e);
    return jsonReply(res, 'error', 'I didn’t get that. Can you repeat?');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaitmindAI listening on port ${PORT}`);
});
