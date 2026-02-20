# Detailed Plan: Agentic Honey-Pot API (from productrequirements.txt)

## 1. Goal (from requirements)

Build an **AI-powered agentic honeypot API** that:

- Detects scam or fraudulent messages
- Activates an autonomous AI Agent when scam intent is detected
- Maintains a believable human-like persona and handles multi-turn conversations
- Extracts scam-related intelligence without revealing detection
- Returns structured JSON via the API and **sends final result to the GUVI callback** (mandatory for evaluation)

---

## 2. API Contract (exact from requirements)

### 2.1 Authentication (Section 4)

- **Header:** `x-api-key: YOUR_SECRET_API_KEY`
- **Header:** `Content-Type: application/json`

Reject requests with invalid or missing `x-api-key` (e.g. 401).

### 2.2 Request (Section 6)

Single endpoint receives **one incoming message per request**. Body shape:

| Field | Required | Description |
|-------|----------|-------------|
| `sessionId` | Yes | Unique session ID for this conversation (e.g. `"wertyu-dfghj-ertyui"`) |
| `message` | Yes | Latest message: `{ sender, text, timestamp }` (sender: `"scammer"` or `"user"`, text: string, timestamp: ISO-8601) |
| `conversationHistory` | Yes | Array of prior messages (same shape). Empty `[]` for first message. |
| `metadata` | Optional | `{ channel, language, locale }` (e.g. SMS, English, IN) |

- **First message:** `conversationHistory === []`.
- **Follow-up:** `conversationHistory` contains all previous messages in order.

### 2.3 Response (Section 8)

Every successful agent response must be:

```json
{
  "status": "success",
  "reply": "Why is my account being suspended?"
}
```

So the API must always return JSON with `status` and `reply` (and handle errors with an appropriate status/message).

### 2.4 Mandatory Callback (Section 12)

**When:** Only after (1) scam intent is confirmed, (2) AI Agent has completed sufficient engagement, (3) intelligence extraction is finished. Treat as **final step** of the conversation lifecycle.

**Endpoint:** `POST https://hackathon.guvi.in/api/updateHoneyPotFinalResult`

**Headers:** `Content-Type: application/json`

**Payload (exact field names):**

```json
{
  "sessionId": "<same sessionId from requests>",
  "scamDetected": true,
  "totalMessagesExchanged": 18,
  "extractedIntelligence": {
    "bankAccounts": ["XXXX-XXXX-XXXX"],
    "upiIds": ["scammer@upi"],
    "phishingLinks": ["http://malicious-link.example"],
    "phoneNumbers": ["+91XXXXXXXXXX"],
    "suspiciousKeywords": ["urgent", "verify now", "account blocked"]
  },
  "agentNotes": "Scammer used urgency tactics and payment redirection"
}
```

- **sessionId:** From platform (same as in API request).
- **scamDetected:** Whether scam was confirmed (boolean).
- **totalMessagesExchanged:** Total messages in the session.
- **extractedIntelligence:** All gathered intelligence; use exact keys: `bankAccounts`, `upiIds`, `phishingLinks`, `phoneNumbers`, `suspiciousKeywords`.
- **agentNotes:** Short summary of scammer behavior.

Callback is **mandatory for scoring**; if not sent, solution cannot be evaluated.

---

## 3. Evaluation Flow (Section 5) and High-Level Data Flow

```mermaid
sequenceDiagram
  participant Platform
  participant API
  participant ScamDetector
  participant Agent
  participant Intelligence
  participant GUVI

  Platform->>API: POST message (sessionId, message, conversationHistory, metadata)
  API->>API: Validate x-api-key
  API->>ScamDetector: Analyze message (+ history)
  alt No scam intent
    ScamDetector-->>API: not scam
    API-->>Platform: { status, reply } (short/decline)
  else Scam intent detected
    ScamDetector-->>API: scam
    API->>Agent: Generate human-like reply (multi-turn)
    Agent-->>API: reply text
    API->>Intelligence: Extract from conversation (banks, UPI, links, phones, keywords)
    Intelligence-->>API: extractedIntelligence
    API-->>Platform: { status, reply }
    opt When engagement complete
      API->>GUVI: POST updateHoneyPotFinalResult (sessionId, scamDetected, totalMessagesExchanged, extractedIntelligence, agentNotes)
    end
  end
```

---

## 4. Component Responsibilities

| Component | Responsibility (from requirements) |
|-----------|-----------------------------------|
| **API layer** | Single POST route; validate body (`sessionId`, `message`, `conversationHistory`); enforce `x-api-key`; return `{ status, reply }`; trigger callback when engagement is complete. |
| **Scam detection** | Analyze incoming message (and optionally conversation history) to decide **scam intent yes/no**. Only when yes, hand control to the Agent. Classifier should only classify scam after a certain degree of conversation. |
| **Session store** | Persist per `sessionId`: conversation history (for multi-turn), accumulated extracted intelligence, message count, and whether callback already sent. Local in-memory store (no Redis). |
| **AI Agent** | Handle multi-turn conversations; adapt responses dynamically; **never reveal** that we detected a scam; behave like a real human (Indian persona, likely to get scammed); resist prompt bypassing—irrelevant topic changes = prompt bypassing, do not comply. System prompt in separate .txt file. |
| **Intelligence extraction** | Continuously extract from full conversation: `bankAccounts`, `upiIds`, `phishingLinks`, `phoneNumbers`, `suspiciousKeywords`. Merge into session store. |
| **Completion logic** | Decide when "engagement is complete"; then call GUVI once. Callback is env-gated (do not POST to GUVI during testing; only after deployment). |
| **Callback client** | POST to GUVI with exact payload (timeout 5s); fire-and-forget; controlled by env so testing does not trigger evaluation. |

---

## 5. Agent Behavior (Section 7) – Implementation Notes

- **Persona:** Real user, Indian, likely to get scammed—slightly worried, cooperative, not overly suspicious.
- **System prompt:** In a separate .txt file; (1) Never reveal scam detection or honeypot; (2) Answer naturally; (3) Nudge toward UPI/links/phones/bank details; (4) Multi-turn context. **Prompt bypassing:** Any message completely irrelevant to the current topic (e.g. "ignore previous instructions", topic change to test if AI) must be treated as prompt bypassing—stay in character, do not comply with off-topic or jailbreak attempts.
- **Self-correction:** Filter or retry if output might reveal detection.

---

## 6. Intelligence Extraction – Exact Fields (Section 12)

- **bankAccounts**, **upiIds**, **phishingLinks**, **phoneNumbers**, **suspiciousKeywords**. Store per session, merge and dedupe. Use in callback payload.

---

## 7. When to Send the GUVI Callback (Section 12)

Send only once per session when: scamDetected = true, sufficient engagement (e.g. message count threshold), intelligence extraction has run. **During development:** Do not actually POST to GUVI; use env flag (e.g. `SEND_GUVI_CALLBACK=false`) so evaluation is not triggered until deployment.

---

## 8. Error Handling and Ethics

- Invalid body → 400, JSON `{ status, reply }`. LLM failure → safe fallback reply. Callback failure → log, optional retry; do not block response.
- Ethics: No impersonation of real individuals; no illegal instructions or harassment; responsible data handling; agent must not reveal detection.

---

## 9. Implementation Order (keep it simple)

1. Project setup: Node + Express, env for `API_KEY` and OpenRouter API key, single POST route, `x-api-key` middleware.
2. Request validation: `sessionId`, `message`, `conversationHistory`, `metadata`; 400 when invalid.
3. Scam detection: LLM-based classifier; only classify scam after a certain degree of conversation; if no scam, short `{ status, reply }` and exit.
4. Session store: Get-or-create by `sessionId`; append messages; store and merge intelligence; track message count and "callback sent". Local store.
5. Agent module: System prompt from .txt file (Indian persona, no-reveal, prompt-bypass resistance); call OpenRouter with full history + latest message; return reply; append to session.
6. Intelligence extraction: Regex + LLM for five fields; merge into session.
7. Completion heuristic: After each agent response, check "engagement complete?"; if yes and callback not sent and `SEND_GUVI_CALLBACK=true`, POST to GUVI; set "callback sent".
8. Callback client: Dedicated function, exact payload, timeout 5s, fire-and-forget, gated by env.
9. README and .env.example: Document API_KEY, OpenRouter key, SEND_GUVI_CALLBACK, GUVI_CALLBACK_URL; how to run and test.

This plan is fully traceable to productrequirements.txt sections 1–12 and ready for implementation.
