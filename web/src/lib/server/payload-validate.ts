export interface PayloadMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Payload {
  v: 1;
  system?: string;
  messages: PayloadMessage[];
}

/**
 * Validates and parses a canonical JSON payload string according to decision D-013:
 * - Total string length <= 16000
 * - Valid JSON object
 * - v === 1
 * - optional system prompt as string
 * - messages non-empty array
 * - each message role is 'user' or 'assistant'
 * - each message content is a string
 * - last message role is 'user'
 */
export function parsePayload(raw: string): Payload {
  if (typeof raw !== 'string') {
    throw new Error('Payload must be a string');
  }
  if (raw.length === 0) {
    throw new Error('Payload cannot be empty');
  }
  if (raw.length > 16000) {
    throw new Error(`Payload exceeds maximum allowed length of 16000 characters (length: ${raw.length})`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    throw new Error(`Payload is not valid JSON: ${err?.message || 'parse error'}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Payload must be a JSON object');
  }

  if (parsed.v !== 1) {
    throw new Error(`Unsupported payload version: ${parsed.v} (expected 1)`);
  }

  if (parsed.system !== undefined) {
    if (typeof parsed.system !== 'string') {
      throw new Error('Payload system prompt must be a string');
    }
  }

  if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    throw new Error('Payload messages must be a non-empty array');
  }

  for (let i = 0; i < parsed.messages.length; i++) {
    const msg = parsed.messages[i];
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      throw new Error(`Message at index ${i} must be an object`);
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      throw new Error(
        `Message at index ${i} has invalid role "${msg.role}" (expected "user" or "assistant")`
      );
    }
    if (typeof msg.content !== 'string') {
      throw new Error(`Message at index ${i} content must be a string`);
    }
  }

  const lastMsg = parsed.messages[parsed.messages.length - 1];
  if (lastMsg.role !== 'user') {
    throw new Error(`Last message in payload must have role "user" (received "${lastMsg.role}")`);
  }

  return {
    v: 1,
    ...(parsed.system ? { system: parsed.system } : {}),
    messages: parsed.messages.map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  };
}
