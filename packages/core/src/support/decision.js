import { env } from '../config/env';
// ── Decision logic ────────────────────────────────────────────────────────────
/**
 * "Check If Support Response" node:
 * Decides whether to send the AI response, escalate to a human, or ignore.
 *
 * Escalation triggers (in order):
 *   1. LLM explicitly flagged escalate: true
 *   2. LLM could not answer (answered: false)
 *   3. Blended confidence score below MIN_CONFIDENCE_SCORE threshold
 */
export function checkIfSupportResponse(agentResponse, confidence) {
    if (agentResponse.escalate) {
        return { decision: 'escalate', reason: 'Agent flagged escalation.' };
    }
    if (!agentResponse.answered) {
        return { decision: 'escalate', reason: 'Agent could not find a satisfactory answer.' };
    }
    if (confidence.score < env.MIN_CONFIDENCE_SCORE) {
        return {
            decision: 'escalate',
            reason: `Confidence ${confidence.score} below threshold ${env.MIN_CONFIDENCE_SCORE}. ${confidence.reason}`,
        };
    }
    return {
        decision: 'respond',
        reason: `Confidence ${confidence.score} (${confidence.level}). ${confidence.reason}`,
        finalResponse: agentResponse.response,
    };
}
//# sourceMappingURL=decision.js.map