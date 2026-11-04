import {
  QuotaGridClient,
  type CompleteResult,
} from './core.js';
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
export function isQuotaError(err: unknown): boolean {
  if (!err) return false;

  // Check HTTP status code
  const errorObj = err as Record<string, any>;
  const status =
    errorObj.status ||
    errorObj.statusCode ||
    errorObj.response?.status ||
    errorObj.response?.statusCode;

  if (status === 429) {
    return true;
  }

  // Check error message, code, or body
  const message = [
    errorObj.message,
    errorObj.code,
    errorObj.error?.message,
    errorObj.error?.code,
    errorObj.error?.type,
    typeof errorObj === 'string' ? errorObj : '',
  ]
    .filter(Boolean)
    .join(' ');

  const quotaPattern = /quota|rate.?limit|RESOURCE_EXHAUSTED|insufficient_quota|credit balance/i;
  return quotaPattern.test(message);
}

/**
 * Wraps a primary LLM caller function with automatic QuotaGrid fallback.
 * Routes to QuotaGrid when remaining budget < threshold (proactive)
 * OR when primary throws a quota error (reactive).
 */
export function withQuotaGridFallback(
  primary: PrimaryFunction,
  opts: FallbackOptions
) {
  const client = opts.client || new QuotaGridClient(opts.config);
  let remainingBudget = opts.budgetTokens ?? Infinity;
  const threshold = opts.thresholdTokens ?? 0;
  let switched = false;

  return async function callWithFallback(req: LLMRequest): Promise<FallbackResponse> {
    const executeQuotaGrid = async (reason: SwitchReason, details?: any): Promise<FallbackResponse> => {
      if (!switched) {
        switched = true;
        opts.onSwitch?.(reason, details);
      }

      const qgResult = await client.complete({
        system: req.system,
        messages: req.messages,
        maxOutputTokens: req.maxOutputTokens,
        models: req.models || opts.models,
        maxPricePerKTokenMON: req.maxPricePerKTokenMON ?? opts.maxPricePerKTokenMON,
        maxSpendPerCallMON: opts.maxSpendPerCallMON,
        maxSpendTotalMON: opts.maxSpendTotalMON,
      });

      return {
        text: qgResult.text,
        usage: {
          inputTokens: Number(qgResult.tMax - BigInt(req.maxOutputTokens || 512)),
          outputTokens: Number(qgResult.tUsed),
        },
        source: 'quotagrid',
        quotagridResult: qgResult,
      };
    };

    // 1. Proactive check: remaining budget < threshold
    if (remainingBudget < threshold) {
      return await executeQuotaGrid('budget_threshold', {
        remainingBudget,
        threshold,
      });
    }

    // 2. Attempt primary call
    try {
      const primaryRes = await primary(req);

      // Track usage and decrement remaining budget
      const totalTokensUsed =
        (primaryRes.usage?.inputTokens || 0) + (primaryRes.usage?.outputTokens || 0);
      remainingBudget -= totalTokensUsed;

      return {
        text: primaryRes.text,
        usage: primaryRes.usage,
        source: 'primary',
      };
    } catch (err: unknown) {
      // 3. Reactive check: switch if quota error
      if (isQuotaError(err)) {
        return await executeQuotaGrid('quota_error', { error: err });
      }

      // Non-quota errors are rethrown
      throw err;
    }
  };
}
