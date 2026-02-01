/**
 * Google Gemini client using @google/genai.
 * Uses GEMINI_API_KEY (or GOOGLE_API_KEY) and model gemini-2.0-flash.
 * Exposes same chat(messages, options) interface as the previous OpenRouter client.
 */

import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-2.0-flash';

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not set');
  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Convert OpenAI-style messages [{ role: 'system'|'user'|'assistant', content }] to Gemini format.
 * System message goes to config.systemInstruction; rest become contents with role 'user' / 'model'.
 */
function toGeminiContents(messages) {
  let systemInstruction = null;
  const contents = [];

  for (const m of messages) {
    const text = (m.content || '').trim();
    if (!text) continue;

    if (m.role === 'system') {
      systemInstruction = text;
      continue;
    }

    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({
      role,
      parts: [{ text }],
    });
  }

  return { contents, systemInstruction };
}

/**
 * Send chat completion. Returns the assistant message text.
 * @param {Array<{ role: string, content: string }>} messages
 * @param {{ model?: string, max_tokens?: number, temperature?: number }} options
 * @returns {Promise<string>}
 */
export async function chat(messages, options = {}) {
  const ai = getClient();
  const model = options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const { contents, systemInstruction } = toGeminiContents(messages);

  const params = {
    model,
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: '' }] }],
    config: {
      maxOutputTokens: options.max_tokens ?? 512,
      temperature: options.temperature ?? 0.7,
    },
  };

  if (systemInstruction) {
    params.config.systemInstruction = systemInstruction;
  }

  const response = await ai.models.generateContent(params);

  const text = response?.text;
  if (text != null) return String(text).trim();
  throw new Error('Gemini: no text in response');
}
