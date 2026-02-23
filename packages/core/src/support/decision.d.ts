import { AgentResponse } from '../llm/schema';
import { ConfidenceScore } from './confidence';
export type SupportDecision = 'respond' | 'escalate' | 'ignore';
export interface DecisionResult {
    decision: SupportDecision;
    reason: string;
    finalResponse?: string;
}
/**
 * "Check If Support Response" node:
 * Decides whether to send the AI response, escalate to a human, or ignore.
 *
 * Escalation triggers (in order):
 *   1. LLM explicitly flagged escalate: true
 *   2. LLM could not answer (answered: false)
 *   3. Blended confidence score below MIN_CONFIDENCE_SCORE threshold
 */
export declare function checkIfSupportResponse(agentResponse: AgentResponse, confidence: ConfidenceScore): DecisionResult;
//# sourceMappingURL=decision.d.ts.map