/**
 * BaitmindAI test script: agent-based conversation with the honeypot API.
 * Acts as a "scammer bot" agent (LLM). Default: Tamil scammer, 20 exchanges
 * (20 scammer + 20 honeypot = 40 messages). Goal: trick scammer into giving UPI/link/phone.
 * Check the server terminal for [Final result] callback JSON when engagement completes.
 *
 * Usage: node scripts/test-api.js
 * Optional: TEST_SCAMMER=tamil (default) or TEST_SCAMMER=english
 * Requires: .env with API_KEY, GEMINI_API_KEY (server running on PORT)
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chat } from '../src/lib/gemini.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const API_KEY = process.env.API_KEY;
const MAX_EXCHANGES = 20;
const SCAMMER_TYPE = process.env.TEST_SCAMMER || 'tamil';

if (!API_KEY) {
  console.error('Missing API_KEY in .env');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  console.error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in .env for scammer agent');
  process.exit(1);
}

const SCAMMER_PROMPT_PATH = join(
  __dirname,
  '..',
  'prompts',
  SCAMMER_TYPE === 'tamil' ? 'scammer-bot-tamil-system-prompt.txt' : 'scammer-bot-system-prompt.txt'
);
let scammerSystemPrompt = '';
try {
  scammerSystemPrompt = readFileSync(SCAMMER_PROMPT_PATH, 'utf8').trim();
} catch (e) {
  console.error('Could not load scammer prompt:', e.message);
  process.exit(1);
}

async function sendToHoneypot(sessionId, scammerText, conversationHistory) {
  const url = `${BASE_URL}/api/message`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      sessionId,
      message: {
        sender: 'scammer',
        text: scammerText,
        timestamp: new Date().toISOString(),
      },
      conversationHistory,
      metadata: {
        channel: 'SMS',
        language: SCAMMER_TYPE === 'tamil' ? 'Tamil' : 'English',
        locale: 'IN',
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ...data };
}

/**
 * Generate next scammer message using LLM.
 * @param {{ sender: string, text: string }[]} history - flat list of scammer/user messages in order
 */
async function generateScammerMessage(history) {
  const userContent =
    history.length === 0
      ? (SCAMMER_TYPE === 'tamil'
          ? 'Start the conversation in Tamil/Tanglish. Send the first message only from the Tamil scammer to the victim (e.g. account block, verify pannunga). One short message only.'
          : 'Start the conversation. Send the first message only from the scammer to the victim (e.g. account will be blocked, verify immediately). One short message only.')
      : `Conversation so far:\n${history.map((m) => (m.sender === 'scammer' ? 'Scammer: ' : 'Victim: ') + m.text).join('\n')}\n\nGenerate the next message from the scammer. One short message only. Stay in character.`;

  const reply = await chat(
    [
      { role: 'system', content: scammerSystemPrompt },
      { role: 'user', content: userContent },
    ],
    { max_tokens: 120, temperature: 0.8 }
  );
  return (reply || '').trim();
}

function log(prefix, obj) {
  console.log(prefix, JSON.stringify(obj, null, 2));
}

async function runAgentConversation(sessionId) {
  const totalMessages = MAX_EXCHANGES * 2;
  console.log('\n' + '='.repeat(60));
  console.log('Test: Agent conversation (scammer bot vs honeypot)');
  console.log('Scammer persona:', SCAMMER_TYPE);
  console.log('Session:', sessionId);
  console.log('Max exchanges:', MAX_EXCHANGES, `(${totalMessages} messages total)`);
  console.log('='.repeat(60));

  const conversationHistory = [];
  let scammerMessage = await generateScammerMessage(conversationHistory);

  for (let exchange = 0; exchange < MAX_EXCHANGES; exchange++) {
    console.log(`\n--- Exchange ${exchange + 1}/${MAX_EXCHANGES} ---`);
    console.log('Scammer:', scammerMessage);

    const result = await sendToHoneypot(sessionId, scammerMessage, conversationHistory);
    log('Honeypot response:', result);

    if (result.status !== 'success' || !result.reply) {
      console.log('(No reply; stopping)');
      break;
    }

    conversationHistory.push(
      { sender: 'scammer', text: scammerMessage, timestamp: new Date().toISOString() },
      { sender: 'user', text: result.reply, timestamp: new Date().toISOString() }
    );

    if (exchange + 1 >= MAX_EXCHANGES) {
      console.log(`\nReached max exchanges (${MAX_EXCHANGES}). Stopping.`);
      break;
    }

    scammerMessage = await generateScammerMessage(conversationHistory);
  }

  console.log('\n--- Summary ---');
  console.log('Total messages in conversation:', conversationHistory.length);
  console.log('Check the SERVER terminal for [Final result] callback JSON (sessionId, scamDetected, totalMessagesExchanged, extractedIntelligence, agentNotes).');
  console.log('='.repeat(60));
}

async function main() {
  console.log('BaitmindAI test (agent mode)');
  console.log('Base URL:', BASE_URL);
  console.log('API_KEY:', API_KEY ? `${API_KEY.slice(0, 8)}...` : '(missing)');

  const sessionId = 'test-agent-session-' + Date.now();

  try {
    await runAgentConversation(sessionId);
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Is the server running? Try: npm start');
    process.exit(1);
  }

  console.log('\nDone.');
}

main();
