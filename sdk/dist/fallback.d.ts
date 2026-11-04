import { QuotaGridClient, type CompleteResult } from './core.js';
import type { PromptMessage } from './payload.js';
import type { QuotaGridConfig } from './config.js';
export interface LLMRequest {
    system?: string;
    messages: PromptMessage[];
    maxOutputTokens?: number;
    models?: string[];
    maxPricePerKTokenMON?: number;
}
export interface LLMUsage {
    inputTokens: number;
    outputTokens: number;
}
export interface PrimaryResponse {
    text: string;
    usage: LLMUsage;
}
export type PrimaryFunction = (req: LLMRequest) => Promise<PrimaryResponse>;
export type SwitchReason = 'budget_threshold' | 'quota_error';
export interface FallbackOptions {
    budgetTokens?: number;
    thresholdTokens?: number;
    models: string[];
    maxPricePerKTokenMON?: number;
    maxSpendPerCallMON?: number;
    maxSpendTotalMON?: number;
    client?: QuotaGridClient;
    config?: Partial<QuotaGridConfig>;
    onSwitch?: (reason: SwitchReason, details?: any) => void;
}
export interface FallbackResponse {
    text: string;
    usage: LLMUsage;
    source: 'primary' | 'quotagrid';
    quotagridResult?: CompleteResult;
}
/**
 * Checks if an error is a quota / rate-limit error.
 * HTTP 429, or message/body matching /quota|rate.?limit|RESOURCE_EXHAUSTED|insufficient_quota|credit balance/i.
 */
export declare function isQuotaError(err: unknown): boolean;
/**
 * Wraps a primary LLM caller function with automatic QuotaGrid fallback.
 * Routes to QuotaGrid when remaining budget < threshold (proactive)
 * OR when primary throws a quota error (reactive).
 */
export declare function withQuotaGridFallback(primary: PrimaryFunction, opts: FallbackOptions): (req: LLMRequest) => Promise<FallbackResponse>;
//# sourceMappingURL=fallback.d.ts.map