import type { PromptMessage } from './payload.js';

export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'developer' | string;
  content: string | { type: string; text?: string }[];
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
  systemInstruction?: { parts: GeminiPart[] } | string;
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
}

/**
 * Extracts plain text from OpenAI message content (handles string or parts array).
 */
export function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object' && typeof p.text === 'string') return p.text;
        return '';
      })
      .join('');
  }
  return String(content || '');
}

/**
 * Converts OpenAI chat request into canonical system and messages format.
 */
export function openAiToPayload(req: OpenAiChatRequest): {
  system?: string;
  messages: PromptMessage[];
  maxOutputTokens: number;
} {
  const systemParts: string[] = [];
  const messages: PromptMessage[] = [];

  for (const m of req.messages || []) {
    const text = extractTextContent(m.content);
    if (m.role === 'system' || m.role === 'developer') {
      systemParts.push(text);
    } else if (m.role === 'assistant') {
      messages.push({ role: 'assistant', content: text });
    } else {
      // Default to 'user'
      messages.push({ role: 'user', content: text });
    }
  }

  const system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
  const maxOutputTokens = req.max_completion_tokens ?? req.max_tokens ?? 512;

  return { system, messages, maxOutputTokens };
}

/**
 * Converts Gemini generateContent request into canonical system and messages format.
 */
export function geminiToPayload(req: GeminiGenerateRequest): {
  system?: string;
  messages: PromptMessage[];
  maxOutputTokens: number;
} {
  let system: string | undefined = undefined;

  if (req.systemInstruction) {
    if (typeof req.systemInstruction === 'string') {
      system = req.systemInstruction;
    } else if (Array.isArray(req.systemInstruction.parts)) {
      system = req.systemInstruction.parts.map((p) => p.text || '').join('');
    }
  }

  const messages: PromptMessage[] = [];
  for (const c of req.contents || []) {
    const text = (c.parts || []).map((p) => p.text || '').join('');
    const role: 'user' | 'assistant' = c.role === 'model' ? 'assistant' : 'user';
    messages.push({ role, content: text });
  }

  const maxOutputTokens = req.generationConfig?.maxOutputTokens ?? 512;

  return { system, messages, maxOutputTokens };
}
