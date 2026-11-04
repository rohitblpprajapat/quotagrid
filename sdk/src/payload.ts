import { keccak256, toBytes } from 'viem';

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
export function buildPayload(options: {
  system?: string;
  messages: PromptMessage[];
}): string {
  const { system, messages } = options;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Payload messages must be a non-empty array');
  }

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user') {
    throw new Error(
      `Last message in payload must have role "user" (received "${lastMsg?.role}")`
    );
  }

  return JSON.stringify({
    v: 1,
    ...(system ? { system } : {}),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
}

/**
 * Computes on-chain promptHash = keccak256(utf8(payload)).
 */
export function hashPayload(payload: string): `0x${string}` {
  return keccak256(toBytes(payload));
}

/**
 * Validates and parses a canonical payload JSON string.
 */
export function parsePayload(payloadStr: string): CanonicalPayload {
  if (typeof payloadStr !== 'string' || payloadStr.length === 0) {
    throw new Error('Payload must be a non-empty string');
  }
  if (payloadStr.length > 16000) {
    throw new Error('Payload exceeds maximum allowed length of 16000 characters');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadStr);
  } catch {
    throw new Error('Payload is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Payload must be a JSON object');
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.v !== 1) {
    throw new Error(`Unsupported payload version: ${obj.v}. Expected 1.`);
  }

  if (obj.system !== undefined && typeof obj.system !== 'string') {
    throw new Error('system property must be a string if provided');
  }

  if (!Array.isArray(obj.messages) || obj.messages.length === 0) {
    throw new Error('messages property must be a non-empty array');
  }

  for (let i = 0; i < obj.messages.length; i++) {
    const msg = obj.messages[i];
    if (typeof msg !== 'object' || msg === null) {
      throw new Error(`Message at index ${i} must be an object`);
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      throw new Error(`Message at index ${i} has invalid role: ${msg.role}. Must be 'user' or 'assistant'.`);
    }
    if (typeof msg.content !== 'string') {
      throw new Error(`Message at index ${i} content must be a string`);
    }
  }

  const lastMsg = obj.messages[obj.messages.length - 1] as PromptMessage;
  if (!lastMsg || lastMsg.role !== 'user') {
    throw new Error(
      `Last message in payload must have role "user" (received "${lastMsg?.role}")`
    );
  }

  return parsed as CanonicalPayload;
}
