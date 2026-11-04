import type { PromptMessage } from './payload.js';
export interface OpenAiMessage {
    role: 'system' | 'user' | 'assistant' | 'developer' | string;
    content: string | {
        type: string;
        text?: string;
    }[];
}
export interface OpenAiChatRequest {
    model?: string;
    messages: OpenAiMessage[];
    max_tokens?: number;
    max_completion_tokens?: number;
    stream?: boolean;
    temperature?: number;
}
export interface GeminiPart {
    text?: string;
}
export interface GeminiContent {
    role?: 'user' | 'model' | string;
    parts: GeminiPart[];
}
export interface GeminiGenerateRequest {
    contents: GeminiContent[];
    systemInstruction?: {
        parts: GeminiPart[];
    } | string;
    generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
    };
}
/**
 * Extracts plain text from OpenAI message content (handles string or parts array).
 */
export declare function extractTextContent(content: unknown): string;
/**
 * Converts OpenAI chat request into canonical system and messages format.
 */
export declare function openAiToPayload(req: OpenAiChatRequest): {
    system?: string;
    messages: PromptMessage[];
    maxOutputTokens: number;
};
/**
 * Converts Gemini generateContent request into canonical system and messages format.
 */
export declare function geminiToPayload(req: GeminiGenerateRequest): {
    system?: string;
    messages: PromptMessage[];
    maxOutputTokens: number;
};
//# sourceMappingURL=converters.d.ts.map