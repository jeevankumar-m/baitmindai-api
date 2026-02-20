/**
 * Completion heuristic: when to consider engagement complete and send GUVI callback.
 */

const MIN_MESSAGES_FOR_COMPLETION = 6;

/**
 * @param {number} messageCount
 * @param {object} extractedIntelligence
 * @returns {boolean}
 */
export function isEngagementComplete(messageCount, extractedIntelligence) {
  if (messageCount < MIN_MESSAGES_FOR_COMPLETION) return false;

  const hasAny =
    (extractedIntelligence.bankAccounts?.length ?? 0) > 0 ||
    (extractedIntelligence.upiIds?.length ?? 0) > 0 ||
    (extractedIntelligence.phishingLinks?.length ?? 0) > 0 ||
    (extractedIntelligence.phoneNumbers?.length ?? 0) > 0 ||
    (extractedIntelligence.emailAddresses?.length ?? 0) > 0 ||
    (extractedIntelligence.caseIds?.length ?? 0) > 0 ||
    (extractedIntelligence.policyNumbers?.length ?? 0) > 0 ||
    (extractedIntelligence.orderNumbers?.length ?? 0) > 0 ||
    (extractedIntelligence.suspiciousKeywords?.length ?? 0) > 0;

  return hasAny;
}
