# BaitmindAI – Agentic Honey-Pot API

AI-powered honeypot API that detects scam messages, engages in multi-turn conversations with a human-like persona, extracts scam-related intelligence, and (when enabled) reports results to the GUVI evaluation endpoint.

## Requirements

- Node.js 18+
- [Google Gemini](https://aistudio.google.com/apikey) API key (for LLM: scam detection + agent)

## Setup

1. Clone and install:

   ```bash
   npm install
   ```

2. Copy env and set values:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `API_KEY` | Yes | Secret for `x-api-key` header (protect your endpoint) |
   | `GEMINI_API_KEY` | Yes | Google Gemini API key ([get one](https://aistudio.google.com/apikey)) |
   | `GEMINI_MODEL` | No | Model ID (default: `gemini-2.0-flash`) |
   | `SEND_GUVI_CALLBACK` | No | Set `true` only after deployment to send results to GUVI (default: `false`) |
   | `GUVI_CALLBACK_URL` | No | Override callback URL (default: hackathon GUVI endpoint) |
   | `PORT` | No | Server port (default: 3000) |

## Run

```bash
npm start
```

Dev with auto-reload:

```bash
npm run dev
```

## Deploy on Render

1. Push the repo to GitHub/GitLab and connect it in [Render](https://render.com).
2. Create a **Web Service**. Render will detect Node from `package.json`.
3. **Build command:** `npm install`
4. **Start command:** `npm start`
5. **Health Check Path:** `/health` (optional; returns `{ "status": "ok", "service": "baitmindai" }`)
6. **Environment** (Dashboard → Environment): set `API_KEY` and `GEMINI_API_KEY`. Optionally set `GEMINI_MODEL`, `SEND_GUVI_CALLBACK` (e.g. `true` for evaluation), `GUVI_CALLBACK_URL`.

The app uses `PORT` from Render and listens on `0.0.0.0`. You can use the optional `render.yaml` as a Blueprint reference.

## API

### POST /api/message

Accepts one incoming message per request. Requires header `x-api-key` and JSON body as in the product requirements.

**Headers**

- `x-api-key`: Your `API_KEY`
- `Content-Type`: application/json

**Body**

- `sessionId` (string, required)
- `message` (object, required): `{ sender, text, timestamp }`
- `conversationHistory` (array, required): prior messages, same shape; `[]` for first message
- `metadata` (object, optional): `{ channel, language, locale }`

**Response**

```json
{
  "status": "success",
  "reply": "Why is my account being suspended?"
}
```

Errors return JSON with `status: "error"` and a short `reply` message (4xx/5xx as appropriate).

## Testing

**Test script (multi-turn conversations):**

1. Start the server: `npm start` (or `npm run dev` in another terminal).
2. Run the test script: `npm run test:api`.

The script uses `API_KEY` from `.env` and sends two test conversations to `POST /api/message`: one scam-style (bank/UPI) and one short casual message. It prints each request and response.

**Manual curl – first message only:**

```bash
curl -X POST http://localhost:3000/api/message \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-1",
    "message": {
      "sender": "scammer",
      "text": "Your bank account will be blocked today. Verify immediately.",
      "timestamp": "2026-01-21T10:15:30Z"
    },
    "conversationHistory": [],
    "metadata": { "channel": "SMS", "language": "English", "locale": "IN" }
  }'
```

## GUVI Callback

When `SEND_GUVI_CALLBACK=true` and engagement is complete, the server POSTs to:

`POST https://hackathon.guvi.in/api/updateHoneyPotFinalResult`

Payload: `sessionId`, `scamDetected`, `totalMessagesExchanged`, `extractedIntelligence`, `agentNotes` (see product requirements). Callback is fire-and-forget and does not block the API response. Leave `SEND_GUVI_CALLBACK=false` during local testing so evaluation is not triggered.

## Documentation

- [Honeypot API detailed plan](documentation/honeypot_api_detailed_plan.md)
- [Product requirements](productrequirements.txt)
