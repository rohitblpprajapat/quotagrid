/**
 * Live provider API documentation references:
 * - Google Gemini:
 *     generateContent: https://ai.google.dev/api/generate-content
 *     countTokens: https://ai.google.dev/api/tokens
 * - Anthropic:
 *     messages: https://docs.claude.com/en/api/messages
 *     count_tokens: https://docs.anthropic.com/en/api/messages-count-tokens
 * - Groq (OpenAI-compatible):
 *     chat completions: https://console.groq.com/docs/api-reference
 */

import { type Payload, parsePayload } from './payload-validate';

export interface TokenCountResult {
  tokens: number;
  exact: boolean;
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
}

const REQUEST_TIMEOUT_MS = 30000;

/**
 * Sanitizes any error message to ensure the API key is NEVER leaked in logs or error messages.
 */
function sanitizeMessage(message: string, apiKey?: string): string {
  if (!apiKey || apiKey.length < 4) {
    return message;
  }
  return message.split(apiKey).join('[REDACTED]');
}

function cleanError(err: unknown, apiKey?: string): Error {
  const original = err instanceof Error ? err.message : String(err);
  return new Error(sanitizeMessage(original, apiKey));
}

function calculateEstimatedTokens(payload: Payload): number {
  let totalChars = payload.system ? payload.system.length : 0;
  for (const msg of payload.messages) {
    totalChars += msg.content ? msg.content.length : 0;
  }
  return Math.ceil(totalChars / 3) + 16;
}

/**
 * Counts input tokens for a multi-turn conversation payload.
 * Uses the provider's free token-counting endpoint if available (exact),
 * or falls back to an estimate: Math.ceil(totalChars / 3) + 16 (exact: false).
 */
export async function countTokens(
  provider: string,
  model: string,
  apiKey: string,
  payloadInput: Payload | string
): Promise<TokenCountResult> {
  const normalizedProvider = provider.toLowerCase();
  const payload: Payload =
    typeof payloadInput === 'string' ? parsePayload(payloadInput) : payloadInput;

  const fallbackEstimate = calculateEstimatedTokens(payload);

  // If no apiKey or openai-compatible, use fallback estimate
  if (!apiKey) {
    return {
      tokens: fallbackEstimate,
      exact: false,
    };
  }

  if (normalizedProvider === 'gemini') {
    // Gemini countTokens endpoint: https://ai.google.dev/api/tokens
    // Supports contents + systemInstruction via generateContentRequest
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:countTokens`;
      const geminiContents = payload.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const bodyPayload = payload.system
        ? {
            generateContentRequest: {
              model: `models/${model}`,
              systemInstruction: {
                parts: [{ text: payload.system }],
              },
              contents: geminiContents,
            },
          }
        : {
            contents: geminiContents,
          };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.totalTokens === 'number') {
          return { tokens: data.totalTokens, exact: true };
        }
      }
    } catch {
      // Fallback to estimation below
    }
  } else if (normalizedProvider === 'anthropic') {
    // Anthropic count_tokens endpoint: https://docs.anthropic.com/en/api/messages-count-tokens
    try {
      const url = 'https://api.anthropic.com/v1/messages/count_tokens';
      const bodyPayload: Record<string, any> = {
        model,
        messages: payload.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
      if (payload.system) {
        bodyPayload.system = payload.system;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.input_tokens === 'number') {
          return { tokens: data.input_tokens, exact: true };
        }
      }
    } catch {
      // Fallback to estimation below
    }
  }

  // Fallback estimation for openai-compatible (e.g. Groq) or on network/auth failure:
  return {
    tokens: fallbackEstimate,
    exact: false,
  };
}

/**
 * Completes a prompt using the specified provider and model.
 * 30s timeout, limits/disables thinking where supported to enforce max output cap,
 * never logs or leaks the API key.
 */
export async function complete(
  provider: string,
  model: string,
  apiKey: string,
  payloadInput: Payload | string,
  maxOutputTokens: number
): Promise<CompletionResult> {
  const normalizedProvider = provider.toLowerCase();
  const payload: Payload =
    typeof payloadInput === 'string' ? parsePayload(payloadInput) : payloadInput;

  if (!apiKey) {
    throw new Error('API key is required for completion');
  }

  try {
    if (normalizedProvider === 'gemini') {
      return await completeGemini(model, apiKey, payload, maxOutputTokens);
    } else if (normalizedProvider === 'anthropic') {
      return await completeAnthropic(model, apiKey, payload, maxOutputTokens);
    } else if (normalizedProvider === 'openai-compatible') {
      return await completeOpenAICompatible(model, apiKey, payload, maxOutputTokens);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (err: unknown) {
    throw cleanError(err, apiKey);
  }
}

/**
 * Gemini generateContent implementation.
 * Docs: https://ai.google.dev/api/generate-content
 * Passes systemInstruction and contents (with assistant mapped to role 'model').
 * Disables thinking budget (budget: 0) where supported so the output token cap holds.
 */
async function completeGemini(
  model: string,
  apiKey: string,
  payload: Payload,
  maxOutputTokens: number
): Promise<CompletionResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const geminiContents = payload.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const makePayload = (disableThinking: boolean) => {
    const generationConfig: Record<string, any> = {
      maxOutputTokens: Math.max(1, maxOutputTokens),
    };
    if (disableThinking) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }
    const body: Record<string, any> = {
      contents: geminiContents,
      generationConfig,
    };
    if (payload.system) {
      body.systemInstruction = {
        parts: [{ text: payload.system }],
      };
    }
    return body;
  };

  // Attempt with thinkingBudget: 0 first
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(makePayload(true)),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  // If thinkingConfig is not supported for this model (e.g. 400 Invalid Argument), retry without thinkingConfig
  if (!res.ok && res.status === 400) {
    const errorText = await res.text();
    if (errorText.toLowerCase().includes('thinking')) {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(makePayload(false)),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } else {
      throw new Error(`Gemini API error (status ${res.status}): ${sanitizeMessage(errorText, apiKey)}`);
    }
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (status ${res.status}): ${sanitizeMessage(errorText, apiKey)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => p.text || '').join('');

  const inputTokens = data?.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data?.usageMetadata?.candidatesTokenCount ?? 0;
  const thinkingTokens = data?.usageMetadata?.thoughtsTokenCount ?? 0;

  return { text, inputTokens, outputTokens, thinkingTokens };
}

/**
 * Anthropic Messages implementation.
 * Docs: https://docs.claude.com/en/api/messages
 * Passes top-level system string and messages array.
 * By omitting extended thinking config, thinking is disabled and max_tokens acts as hard cap.
 */
async function completeAnthropic(
  model: string,
  apiKey: string,
  payload: Payload,
  maxOutputTokens: number
): Promise<CompletionResult> {
  const url = 'https://api.anthropic.com/v1/messages';

  const body: Record<string, any> = {
    model,
    max_tokens: Math.max(1, maxOutputTokens),
    messages: payload.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
  if (payload.system) {
    body.system = payload.system;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Anthropic API error (status ${res.status}): ${sanitizeMessage(errorText, apiKey)}`);
  }

  const data = await res.json();
  const text = (data?.content || [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text || '')
    .join('');

  const inputTokens = data?.usage?.input_tokens ?? 0;
  const outputTokens = data?.usage?.output_tokens ?? 0;
  const thinkingTokens = 0;

  return { text, inputTokens, outputTokens, thinkingTokens };
}

/**
 * OpenAI-compatible / Groq Chat Completions implementation.
 * Docs: https://console.groq.com/docs/api-reference
 * Prepends a { role: 'system' } message if payload.system is specified.
 */
async function completeOpenAICompatible(
  model: string,
  apiKey: string,
  payload: Payload,
  maxOutputTokens: number
): Promise<CompletionResult> {
  const baseUrl = process.env.GROQ_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const openAiMessages = [
    ...(payload.system ? [{ role: 'system', content: payload.system }] : []),
    ...payload.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.max(1, maxOutputTokens),
      messages: openAiMessages,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI-compatible API error (status ${res.status}): ${sanitizeMessage(errorText, apiKey)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';

  const inputTokens = data?.usage?.prompt_tokens ?? 0;
  const outputTokens = data?.usage?.completion_tokens ?? 0;
  const thinkingTokens = data?.usage?.completion_tokens_details?.reasoning_tokens ?? 0;

  return { text, inputTokens, outputTokens, thinkingTokens };
}
