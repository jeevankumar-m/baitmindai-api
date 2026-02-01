/**
 * OpenRouter client using official @openrouter/sdk.
 * Uses OPENROUTER_API_KEY and OPENROUTER_MODEL from env.
 * On 404 (model not found), retries with OPENROUTER_FALLBACK_MODEL or openai/gpt-3.5-turbo.
 */

import { OpenRouter } from '@openrouter/sdk';

const FALLBACK_MODEL = 'openai/gpt-3.5-turbo';

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
  client = new OpenRouter({ apiKey });
  return client;
}

function isModelNotFound(err) {
  const code = err?.statusCode ?? err?.status;
  const body = (typeof err?.body === 'string' ? err.body : '') || '';
  const msg = (err?.message || '') + body;
  return code === 404 || msg.includes('No endpoints found');
}

/**
 * Send chat completion (text-only). Returns the assistant message content.
 * @param {Array<{ role: string, content: string }>} messages
 * @param {{ model?: string, max_tokens?: number, temperature?: number }} options
 * @returns {Promise<string>}
 */
export async function chat(messages, options = {}) {
  const openrouter = getClient();
  const preferred =
    options.model || process.env.OPENROUTER_MODEL || FALLBACK_MODEL;
  const fallback = process.env.OPENROUTER_FALLBACK_MODEL || FALLBACK_MODEL;

  const send = async (model) => {
    return openrouter.chat.send({
      model,
      messages,
      maxTokens: options.max_tokens ?? 512,
      temperature: options.temperature ?? 0.7,
      stream: false,
    });
  };

  let result;
  try {
    result = await send(preferred);
  } catch (err) {
    if (isModelNotFound(err) && fallback !== preferred) {
      console.warn(
        `[OpenRouter] Model "${preferred}" not available (404). Using fallback: ${fallback}. Set OPENROUTER_MODEL to a valid model at https://openrouter.ai/models`
      );
      result = await send(fallback);
    } else {
      throw err;
    }
  }

  const message = result.choices?.[0]?.message;
  if (!message) {
    throw new Error('OpenRouter: no message in response');
  }
  const content = message.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    const text = content.find((c) => c?.type === 'text' && c?.text);
    return text ? String(text.text).trim() : '';
  }
  throw new Error('OpenRouter: no content in response');
}
