/**
 * Extracts plain text from OpenAI message content (handles string or parts array).
 */
export function extractTextContent(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((p) => {
            if (typeof p === 'string')
                return p;
            if (p && typeof p === 'object' && typeof p.text === 'string')
                return p.text;
            return '';
        })
            .join('');
    }
    return String(content || '');
}
/**
 * Converts OpenAI chat request into canonical system and messages format.
 */
export function openAiToPayload(req) {
    const systemParts = [];
    const messages = [];
    for (const m of req.messages || []) {
        const text = extractTextContent(m.content);
        if (m.role === 'system' || m.role === 'developer') {
            systemParts.push(text);
        }
        else if (m.role === 'assistant') {
            messages.push({ role: 'assistant', content: text });
        }
        else {
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
export function geminiToPayload(req) {
    let system = undefined;
    if (req.systemInstruction) {
        if (typeof req.systemInstruction === 'string') {
            system = req.systemInstruction;
        }
        else if (Array.isArray(req.systemInstruction.parts)) {
            system = req.systemInstruction.parts.map((p) => p.text || '').join('');
        }
    }
    const messages = [];
    for (const c of req.contents || []) {
        const text = (c.parts || []).map((p) => p.text || '').join('');
        const role = c.role === 'model' ? 'assistant' : 'user';
        messages.push({ role, content: text });
    }
    const maxOutputTokens = req.generationConfig?.maxOutputTokens ?? 512;
    return { system, messages, maxOutputTokens };
}
//# sourceMappingURL=converters.js.map