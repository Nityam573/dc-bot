import { z } from 'zod';
export declare const AgentResponseSchema: z.ZodObject<{
    answered: z.ZodBoolean;
    confidence: z.ZodNumber;
    response: z.ZodString;
    escalate: z.ZodBoolean;
    usedChunks: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    answered: boolean;
    confidence: number;
    response: string;
    escalate: boolean;
    usedChunks: number[];
}, {
    answered: boolean;
    confidence: number;
    response: string;
    escalate: boolean;
    usedChunks?: number[] | undefined;
}>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export declare function parseAgentResponse(raw: string): AgentResponse;
//# sourceMappingURL=schema.d.ts.map