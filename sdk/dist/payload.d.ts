export interface PromptMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface CanonicalPayload {
    v: 1;
    system?: string;
    messages: PromptMessage[];
}
/**
 * Builds canonical JSON payload matching web app byte-for-byte:
 * JSON.stringify({v:1, ...(system ? {system} : {}), messages: messages.map(m => ({role: m.role, content: m.content}))})
 */
export declare function buildPayload(options: {
    system?: string;
    messages: PromptMessage[];
}): string;
/**
 * Computes on-chain promptHash = keccak256(utf8(payload)).
 */
export declare function hashPayload(payload: string): `0x${string}`;
/**
 * Validates and parses a canonical payload JSON string.
 */
export declare function parsePayload(payloadStr: string): CanonicalPayload;
//# sourceMappingURL=payload.d.ts.map