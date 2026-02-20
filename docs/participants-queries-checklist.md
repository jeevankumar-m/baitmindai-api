# Participants Queries – Checklist for 100/100

From **Participants Queries.pdf** (what other teams missed and how we cover it).

## 1. Engagement Quality (20 pts) – **Fixed**

**What others missed:** Most teams got **0/20** because they did not include **`engagementMetrics`** in the final output.

**Evaluator logic (from PDF):**
```python
metrics = final_output.get('engagementMetrics', {})
duration = metrics.get('engagementDurationSeconds', 0)
```

**Our implementation:** We send both root-level and nested so either format is accepted:
- `engagementDurationSeconds` (root)
- `engagementMetrics: { engagementDurationSeconds, totalMessagesExchanged }` (nested)

**Scoring:** Duration > 0s (5), Duration > 60s (5), Messages > 0 (5), Messages ≥ 5 (5) = 20 pts.

---

## 2. Response Structure (20 pts)

**What others missed:** 12–15/20 from missing optional fields: **engagementMetrics**, **agentNotes**.

**Our implementation:**
- `status` (in API response; callback has sessionId, scamDetected, etc.)
- `scamDetected`, `extractedIntelligence` ✓
- `engagementMetrics` ✓ (added)
- `agentNotes` ✓

---

## 3. Scam Detection (20 pts)

**Our implementation:** We set `scamDetected: true` when the agent path is taken. Trivial if output is submitted.

---

## 4. Intelligence Extraction (40 pts)

**What others missed:** Teams scored 23–35/40; data is “literally handed in the conversation text”.

**Our implementation:** Regex extraction for phones (10), bank accounts (10), UPI IDs (10), phishing links (10), plus emailAddresses, caseIds, policyNumbers, orderNumbers. No hardcoding.

---

## 5. API Timeout (30 seconds)

**What others missed:** 131 timeout errors across 29 hosts; one Render endpoint timed out 29 times.

**Our implementation:** Single LLM call per turn + regex-only extraction. No long chains. Aim for &lt;30s per request (production hosting, not ngrok/laptop).

---

## 6. Processing time

- **15 scenarios × 10 turns = 150 API calls** per submission.
- Fast endpoints: ~7 minutes total. Slow: up to ~50 minutes.
- We key by `sessionId`; no cross-session state.

---

## 7. scamType

**From PDF:** “Scam type classification was never part of the scoring rubric.” No points for it. We send it optionally; no impact on score.

---

## Summary

| Category            | Max | Common loss        | Our fix                          |
|---------------------|-----|--------------------|-----------------------------------|
| Scam Detection      | 20  | 0                  | scamDetected: true ✓             |
| Intelligence        | 40  | 5–17               | Full extraction, all types ✓     |
| Engagement Quality  | 20  | **20 (missing obj)** | **engagementMetrics** added ✓   |
| Response Structure  | 20  | 5–8                | engagementMetrics + agentNotes ✓ |
| Timeout             | —   | Failures           | Fast path, &lt;30s design ✓      |
