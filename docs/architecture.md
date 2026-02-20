# BaitmindAI – Architecture

## Overview

BaitmindAI is an agentic honeypot API built with **Node.js** and **Express**. It receives messages from an evaluation platform, detects scam intent, runs a human-like AI agent for multi-turn conversation, extracts intelligence (UPI, links, phone numbers, etc.), and reports results to the GUVI callback when engagement is complete.

## Repository Structure

```
your-repo/
├── README.md                 # Setup and usage instructions
├── src/                      # Source code (Node.js)
│   ├── index.js             # Main API entry (Express server, routes)
│   ├── agent.js             # Honeypot agent logic (LLM-based reply generation)
│   ├── scamDetector.js      # Scam intent classification
│   ├── sessionStore.js      # In-memory session state
│   ├── completion.js        # Engagement completion heuristic
│   ├── callback.js          # GUVI callback client
│   ├── intelligence.js      # Intelligence extraction from conversation
│   ├── middleware/          # Auth (x-api-key)
│   ├── lib/                 # Gemini / LLM clients
│   └── scripts/             # Test and utility scripts (remove before final push if desired)
├── prompts/                 # Agent system prompts (plain text)
├── docs/                     # Documentation
│   ├── architecture.md      # This file
│   └── honeypot_api_detailed_plan.md
├── requirements.txt          # Python deps (N/A – this project is Node.js; see package.json)
├── package.json              # Node.js dependencies and scripts
└── .env.example              # Environment variables template
```

## Main Components

| Component        | Role |
|-----------------|------|
| **index.js**    | Express app: `POST /api/message`, `GET /health`, CORS, body parsing, auth. Orchestrates scam detection → agent → intelligence → completion → callback. |
| **agent.js**    | Honeypot agent: loads system prompt from `prompts/`, calls Gemini to generate human-like replies, never reveals detection. |
| **scamDetector.js** | Classifies incoming message (and context) as scam or not; only when scam intent is detected does the agent run. |
| **sessionStore.js** | Per-`sessionId` in-memory store: conversation history, extracted intelligence, callback-sent flag. |
| **intelligence.js** | Extracts from full conversation: bank accounts, UPI IDs, phishing links, phone numbers, suspicious keywords. |
| **completion.js** | Decides when engagement is “complete” (e.g. message count / stability); gates GUVI callback. |
| **callback.js**  | Sends `POST` to GUVI with `sessionId`, `scamDetected`, `totalMessagesExchanged`, `extractedIntelligence`, `agentNotes`. Env-gated (`SEND_GUVI_CALLBACK`). |

## Data Flow

1. **Request:** Platform sends `POST /api/message` with `sessionId`, `message`, `conversationHistory`, `metadata`. Auth via `x-api-key`.
2. **Scam check:** If no scam intent → short decline reply and exit.
3. **Agent:** If scam intent → agent generates reply using Gemini and system prompt; reply returned in `{ status, reply }`.
4. **Intelligence:** Conversation is scanned; extracted entities are merged into the session store.
5. **Completion:** When engagement is complete and callback not yet sent and `SEND_GUVI_CALLBACK=true`, callback is fired asynchronously to GUVI.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express
- **LLM:** Google Gemini (via `@google/genai`) for scam detection and agent
- **Config:** `dotenv`; see `.env.example` for variables.

## Optional: Python

This repository template allows for a `requirements.txt` and `main.py`; BaitmindAI is implemented in Node.js only. Dependencies are in `package.json`.
