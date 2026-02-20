# Honeypot API

## Description

BaitmindAI is an agentic honeypot API that detects scam messages, engages in multi-turn conversations with a human-like persona, extracts scam-related intelligence (phone numbers, UPI IDs, links, bank details, etc.), and reports results to the GUVI evaluation endpoint when enabled. The agent acts as a worried, non–tech-savvy user to keep scammers talking and elicit actionable intelligence before closing the engagement.

## Tech Stack

- **Language/Framework:** Node.js 18+, Express
- **Key libraries:** `@google/genai`, `dotenv`, `express`
- **LLM/AI models:** Google Gemini (`gemini-2.0-flash` by default) for scam intent classification and honeypot reply generation

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd baitmindai-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set at least:
   - `API_KEY` – secret for the `x-api-key` header
   - `GEMINI_API_KEY` – [Google AI Studio API key](https://aistudio.google.com/apikey)  
   Optionally: `GEMINI_MODEL`, `SEND_GUVI_CALLBACK`, `GUVI_CALLBACK_URL`, `PORT`

4. **Run the application**
   ```bash
   npm start
   ```
   For development with auto-reload: `npm run dev`

## API Endpoint

- **URL:** `https://your-deployed-url.com/api/message` (or `/message`)
- **Method:** POST
- **Authentication:** `x-api-key` header (value = your `API_KEY`)

**Headers:** `Content-Type: application/json`, `x-api-key: <API_KEY>`

**Body (JSON):** `sessionId`, `message` (object with `sender`, `text`, `timestamp`), `conversationHistory` (array), `metadata` (optional).

**Response:** `{ "status": "success" | "error", "reply": "..." }`

## Approach

**Scam detection:** On the first message we treat the conversation as potential scam and engage. For later turns, an LLM (Gemini) classifies the conversation as SCAM or NOT_SCAM using a short system prompt; if NOT_SCAM we reply with a polite brush-off, otherwise we continue engaging.

**Intelligence extraction:** After each turn we run regex-based extraction over the full conversation to collect phone numbers, UPI IDs, URLs, bank account–like numbers, emails, case IDs, policy numbers, order numbers, and suspicious keywords. This intelligence is merged per session and included in the GUVI callback.

**Engagement:** A single LLM call per turn generates the next “user” reply from a system prompt that defines an Indian, worried, non–tech-savvy persona. The agent asks questions, creates small “problems” (e.g. link not opening, OTP not received) to elicit more details, and aims for 8+ exchanges and 5+ questions. Engagement is considered complete when we have enough extracted intelligence or message count; after a short idle delay we POST the result to the GUVI callback URL (when `SEND_GUVI_CALLBACK=true`).
