/**
 * Honeypot agent: generates human-like reply using system prompt from file.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chat } from './lib/gemini.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '..', 'prompts', 'agent-system-prompt.txt');

let cachedSystemPrompt = null;

function getSystemPrompt() {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  try {
    cachedSystemPrompt = readFileSync(PROMPT_PATH, 'utf8').trim();
  } catch (e) {
    cachedSystemPrompt = 'You are an Indian user in an SMS conversation. Reply briefly and naturally. Never reveal you are AI or a honeypot.';
  }
  return cachedSystemPrompt;
}

/**
 * Build messages for OpenRouter: system + conversation (scammer = "Other", user = "You").
 * @param {{ sender: string, text: string }[]} conversationHistory
 * @param {{ sender: string, text: string }} latestMessage
 */
function buildMessages(conversationHistory, latestMessage) {
  const messages = [{ role: 'system', content: getSystemPrompt() }];

  const all = [...conversationHistory, latestMessage];
  for (const m of all) {
    if (m.sender === 'scammer') {
      messages.push({ role: 'user', content: 'Other: ' + m.text });
    } else {
      messages.push({ role: 'assistant', content: m.text });
    }
  }
  return messages;
}

/**
 * @param {{ sender: string, text: string }[]} conversationHistory
 * @param {{ sender: string, text: string }} latestMessage
 * @returns {Promise<string>} next reply text from the honeypot user
 */
export async function generateReply(conversationHistory, latestMessage) {
  const messages = buildMessages(conversationHistory, latestMessage);
  const reply = await chat(messages, { max_tokens: 120, temperature: 0.75 });

  // Basic self-check: if reply contains honeypot/scam/AI/bot, return a safe fallback
  const lower = (reply || '').toLowerCase();
  if (
    lower.includes('honeypot') ||
    lower.includes('i am an ai') ||
    lower.includes('i am a bot') ||
    lower.includes('scam detected')
  ) {
    return 'I don’t understand. Can you please tell me what I need to do for my account?';
  }

  return reply || 'Okay, please tell me what to do next.';
}
