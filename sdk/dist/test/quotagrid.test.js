import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEther, keccak256, toBytes } from 'viem';
import { buildPayload, parsePayload, hashPayload, } from '../payload.js';
import { isQuotaError, withQuotaGridFallback, } from '../fallback.js';
import { openAiToPayload, geminiToPayload, } from '../converters.js';
import { QuotaGridClient, NoListingError, } from '../core.js';
describe('QuotaGrid SDK Test Suite', () => {
    describe('Payload byte-equality and canonical JSON format', () => {
        it('produces byte-exact canonical JSON without system prompt', () => {
            const payload = buildPayload({
                messages: [{ role: 'user', content: 'hello world' }],
            });
            const expected = '{"v":1,"messages":[{"role":"user","content":"hello world"}]}';
            assert.equal(payload, expected);
            const parsed = parsePayload(payload);
            assert.equal(parsed.v, 1);
            assert.equal(parsed.system, undefined);
            assert.equal(parsed.messages.length, 1);
            assert.equal(parsed.messages[0].role, 'user');
            assert.equal(parsed.messages[0].content, 'hello world');
            const expectedHash = keccak256(toBytes(expected));
            assert.equal(hashPayload(payload), expectedHash);
        });
        it('produces byte-exact canonical JSON with system prompt and multi-turn messages', () => {
            const payload = buildPayload({
                system: 'You are a helpful assistant.',
                messages: [
                    { role: 'user', content: 'What is 2+2?' },
                    { role: 'assistant', content: '4' },
                    { role: 'user', content: 'Multiply by 3' },
                ],
            });
            const expected = '{"v":1,"system":"You are a helpful assistant.","messages":[{"role":"user","content":"What is 2+2?"},{"role":"assistant","content":"4"},{"role":"user","content":"Multiply by 3"}]}';
            assert.equal(payload, expected);
            const parsed = parsePayload(payload);
            assert.equal(parsed.v, 1);
            assert.equal(parsed.system, 'You are a helpful assistant.');
            assert.equal(parsed.messages.length, 3);
            assert.equal(parsed.messages[1].role, 'assistant');
            assert.equal(parsed.messages[1].content, '4');
            const expectedHash = keccak256(toBytes(expected));
            assert.equal(hashPayload(payload), expectedHash);
        });
        it('rejects invalid payload inputs in parsePayload', () => {
            assert.throws(() => parsePayload(''), /Payload must be a non-empty string/);
            assert.throws(() => parsePayload('not json'), /Payload is not valid JSON/);
            assert.throws(() => parsePayload('{"v":2,"messages":[]}'), /Unsupported payload version/);
            assert.throws(() => parsePayload('{"v":1,"messages":[]}'), /non-empty array/);
        });
    });
    describe('isQuotaError classification', () => {
        it('identifies HTTP 429 statuses', () => {
            assert.equal(isQuotaError({ status: 429 }), true);
            assert.equal(isQuotaError({ statusCode: 429 }), true);
            assert.equal(isQuotaError({ response: { status: 429 } }), true);
            assert.equal(isQuotaError({ response: { statusCode: 429 } }), true);
        });
        it('identifies rate limit and quota keyword variations', () => {
            assert.equal(isQuotaError(new Error('Rate limit exceeded. Please try again.')), true);
            assert.equal(isQuotaError(new Error('rate_limit')), true);
            assert.equal(isQuotaError(new Error('You exceeded your current quota')), true);
            assert.equal(isQuotaError(new Error('RESOURCE_EXHAUSTED: quota exceeded')), true);
            assert.equal(isQuotaError(new Error('insufficient_quota')), true);
            assert.equal(isQuotaError(new Error('Your credit balance is too low to complete this request.')), true);
            assert.equal(isQuotaError({ error: { message: 'Quota exhausted for this project' } }), true);
            assert.equal(isQuotaError({ error: { code: 'insufficient_quota' } }), true);
        });
        it('rejects non-quota errors', () => {
            assert.equal(isQuotaError(new Error('401 Unauthorized: Invalid API key')), false);
            assert.equal(isQuotaError(new Error('400 Bad Request: missing field')), false);
            assert.equal(isQuotaError(new Error('500 Internal Server Error')), false);
            assert.equal(isQuotaError(new Error('Connection timed out')), false);
            assert.equal(isQuotaError({ status: 400 }), false);
            assert.equal(isQuotaError({ status: 500 }), false);
            assert.equal(isQuotaError(null), false);
            assert.equal(isQuotaError(undefined), false);
        });
    });
    describe('OpenAI and Gemini Converters', () => {
        it('converts OpenAI request with system prompt and multi-turn messages', () => {
            const openAiReq = {
                model: 'llama-3.1-8b-instant',
                max_completion_tokens: 256,
                messages: [
                    { role: 'system', content: 'System instruction' },
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there' },
                    { role: 'user', content: 'How are you?' },
                ],
            };
            const result = openAiToPayload(openAiReq);
            assert.equal(result.system, 'System instruction');
            assert.equal(result.maxOutputTokens, 256);
            assert.equal(result.messages.length, 3);
            assert.deepEqual(result.messages[0], { role: 'user', content: 'Hello' });
            assert.deepEqual(result.messages[1], { role: 'assistant', content: 'Hi there' });
            assert.deepEqual(result.messages[2], { role: 'user', content: 'How are you?' });
        });
        it('handles OpenAI multipart array text contents and developer role', () => {
            const openAiReq = {
                messages: [
                    { role: 'developer', content: 'Dev system rule' },
                    {
                        role: 'user',
                        content: [{ type: 'text', text: 'part 1 ' }, { type: 'text', text: 'part 2' }],
                    },
                ],
            };
            const result = openAiToPayload(openAiReq);
            assert.equal(result.system, 'Dev system rule');
            assert.equal(result.messages[0].content, 'part 1 part 2');
            assert.equal(result.maxOutputTokens, 512); // default
        });
        it('converts Gemini request with systemInstruction and contents', () => {
            const geminiReq = {
                systemInstruction: { parts: [{ text: 'Gemini system prompt' }] },
                generationConfig: { maxOutputTokens: 300 },
                contents: [
                    { role: 'user', parts: [{ text: 'Question 1' }] },
                    { role: 'model', parts: [{ text: 'Answer 1' }] },
                    { role: 'user', parts: [{ text: 'Question 2' }] },
                ],
            };
            const result = geminiToPayload(geminiReq);
            assert.equal(result.system, 'Gemini system prompt');
            assert.equal(result.maxOutputTokens, 300);
            assert.equal(result.messages.length, 3);
            assert.deepEqual(result.messages[0], { role: 'user', content: 'Question 1' });
            assert.deepEqual(result.messages[1], { role: 'assistant', content: 'Answer 1' });
            assert.deepEqual(result.messages[2], { role: 'user', content: 'Question 2' });
        });
    });
    describe('pickListing ordering, cap, and capacity checks', () => {
        const client = new QuotaGridClient();
        const mockListings = [
            {
                id: 1n,
                seller: '0x1111111111111111111111111111111111111111',
                provider: 'groq',
                model: 'llama-3.1-8b-instant',
                pricePerKToken: parseEther('0.02'),
                quotaTotal: 1000n,
                quotaUsed: 200n,
                quotaLocked: 300n,
                available: 500n, // 500 available
                active: true,
                encryptedKey: '0x',
            },
            {
                id: 2n,
                seller: '0x2222222222222222222222222222222222222222',
                provider: 'groq',
                model: 'llama-3.1-8b-instant',
                pricePerKToken: parseEther('0.01'), // cheaper
                quotaTotal: 2000n,
                quotaUsed: 0n,
                quotaLocked: 500n,
                available: 1500n,
                active: true,
                encryptedKey: '0x',
            },
            {
                id: 3n,
                seller: '0x3333333333333333333333333333333333333333',
                provider: 'gemini',
                model: 'gemini-3.5-flash-lite',
                pricePerKToken: parseEther('0.01'), // same price as #2
                quotaTotal: 5000n,
                quotaUsed: 0n,
                quotaLocked: 0n,
                available: 5000n,
                active: true,
                encryptedKey: '0x',
            },
            {
                id: 4n,
                seller: '0x4444444444444444444444444444444444444444',
                provider: 'groq',
                model: 'llama-3.1-8b-instant',
                pricePerKToken: parseEther('0.005'),
                quotaTotal: 1000n,
                quotaUsed: 0n,
                quotaLocked: 0n,
                available: 1000n,
                active: false, // inactive!
                encryptedKey: '0x',
            },
        ];
        it('picks the cheapest active listing with sufficient capacity', () => {
            const picked = client.pickListing(mockListings, {
                models: ['llama-3.1-8b-instant'],
                tMax: 600,
            });
            // Listing 4 is inactive, Listing 1 has only 500 capacity, so Listing 2 is chosen
            assert.equal(picked.id, 2n);
        });
        it('prefers earlier model in models array on price tie', () => {
            // Listing 2 (llama) and Listing 3 (gemini) both have price 0.01 MON
            const pickGeminiFirst = client.pickListing(mockListings, {
                models: ['gemini-3.5-flash-lite', 'llama-3.1-8b-instant'],
                tMax: 500,
            });
            assert.equal(pickGeminiFirst.id, 3n);
            const pickLlamaFirst = client.pickListing(mockListings, {
                models: ['llama-3.1-8b-instant', 'gemini-3.5-flash-lite'],
                tMax: 500,
            });
            assert.equal(pickLlamaFirst.id, 2n);
        });
        it('throws NoListingError when price exceeds cap', () => {
            assert.throws(() => client.pickListing(mockListings, {
                models: ['llama-3.1-8b-instant'],
                maxPricePerKTokenMON: 0.005, // Cap is 0.005 MON, cheapest active is 0.01
                tMax: 100,
            }), (err) => err instanceof NoListingError && err.message.includes('exceed max price cap'));
        });
        it('throws NoListingError when available capacity is insufficient', () => {
            assert.throws(() => client.pickListing(mockListings, {
                models: ['llama-3.1-8b-instant'],
                tMax: 5000, // Highest available is 1500
            }), (err) => err instanceof NoListingError && err.message.includes('available quota'));
        });
        it('throws NoListingError when model is not listed', () => {
            assert.throws(() => client.pickListing(mockListings, {
                models: ['gpt-99-unknown'],
                tMax: 100,
            }), (err) => err instanceof NoListingError && err.message.includes('No listings found'));
        });
    });
    describe('withQuotaGridFallback proactive and reactive switch logic', () => {
        it('routes to primary while budget >= threshold, then switches proactively', async () => {
            const switchEvents = [];
            let primaryCallCount = 0;
            let quotaGridCallCount = 0;
            const mockPrimary = async (req) => {
                primaryCallCount++;
                return {
                    text: `Primary answer for ${req.messages[0].content}`,
                    usage: { inputTokens: 20, outputTokens: 30 }, // 50 tokens each call
                };
            };
            const mockQuotaGridClient = {
                complete: async (opts) => {
                    quotaGridCallCount++;
                    return {
                        text: `QuotaGrid answer for ${opts.messages[0].content}`,
                        listingId: 1n,
                        model: 'llama-3.1-8b-instant',
                        requestId: 42n,
                        tMax: 500n,
                        tUsed: 40n,
                        depositWei: parseEther('0.01'),
                        sellerPayoutWei: parseEther('0.009'),
                        feeWei: parseEther('0.001'),
                        refundWei: 0n,
                        openTx: '0xopen123',
                        settleTx: '0xsettle123',
                        latencyMs: 120,
                    };
                },
            };
            const caller = withQuotaGridFallback(mockPrimary, {
                budgetTokens: 110,
                thresholdTokens: 50,
                models: ['llama-3.1-8b-instant'],
                client: mockQuotaGridClient,
                onSwitch: (reason, details) => {
                    switchEvents.push({ reason, details });
                },
            });
            // Call 1: initial budget 110 -> primary used 50 -> remaining 60 >= 50 threshold
            const res1 = await caller({ messages: [{ role: 'user', content: 'q1' }] });
            assert.equal(res1.source, 'primary');
            assert.equal(primaryCallCount, 1);
            assert.equal(quotaGridCallCount, 0);
            // Call 2: budget 60 -> primary used 50 -> remaining 10 (< 50 threshold)
            const res2 = await caller({ messages: [{ role: 'user', content: 'q2' }] });
            assert.equal(res2.source, 'primary');
            assert.equal(primaryCallCount, 2);
            assert.equal(quotaGridCallCount, 0);
            // Call 3: remaining budget 10 is < threshold (50) -> proactive switch to QuotaGrid!
            const res3 = await caller({ messages: [{ role: 'user', content: 'q3' }] });
            assert.equal(res3.source, 'quotagrid');
            assert.equal(primaryCallCount, 2); // Primary was NOT called!
            assert.equal(quotaGridCallCount, 1);
            assert.equal(res3.quotagridResult?.requestId, 42n);
            assert.equal(switchEvents.length, 1);
            assert.equal(switchEvents[0].reason, 'budget_threshold');
        });
        it('switches reactively on primary quota error (429)', async () => {
            const switchEvents = [];
            let quotaGridCallCount = 0;
            const failingPrimary = async () => {
                const err = new Error('Rate limit exceeded: 429 Too Many Requests');
                err.status = 429;
                throw err;
            };
            const mockQuotaGridClient = {
                complete: async () => {
                    quotaGridCallCount++;
                    return {
                        text: 'QuotaGrid fallback response',
                        listingId: 2n,
                        model: 'gemini-3.5-flash-lite',
                        requestId: 99n,
                        tMax: 500n,
                        tUsed: 30n,
                        depositWei: parseEther('0.01'),
                        sellerPayoutWei: parseEther('0.009'),
                        feeWei: parseEther('0.001'),
                        refundWei: 0n,
                        openTx: '0xopen99',
                        settleTx: '0xsettle99',
                        latencyMs: 150,
                    };
                },
            };
            const caller = withQuotaGridFallback(failingPrimary, {
                budgetTokens: 5000,
                thresholdTokens: 50,
                models: ['gemini-3.5-flash-lite'],
                client: mockQuotaGridClient,
                onSwitch: (reason) => {
                    switchEvents.push({ reason });
                },
            });
            const res = await caller({ messages: [{ role: 'user', content: 'test question' }] });
            assert.equal(res.source, 'quotagrid');
            assert.equal(quotaGridCallCount, 1);
            assert.equal(switchEvents.length, 1);
            assert.equal(switchEvents[0].reason, 'quota_error');
        });
        it('rethrows non-quota errors without switching to QuotaGrid', async () => {
            let quotaGridCalled = false;
            const failingPrimary = async () => {
                const err = new Error('401 Unauthorized: Invalid API Key');
                err.status = 401;
                throw err;
            };
            const mockQuotaGridClient = {
                complete: async () => {
                    quotaGridCalled = true;
                    return {};
                },
            };
            const caller = withQuotaGridFallback(failingPrimary, {
                budgetTokens: 1000,
                thresholdTokens: 50,
                models: ['llama-3.1-8b-instant'],
                client: mockQuotaGridClient,
            });
            await assert.rejects(async () => {
                await caller({ messages: [{ role: 'user', content: 'test' }] });
            }, (err) => err.status === 401 && err.message.includes('401 Unauthorized'));
            assert.equal(quotaGridCalled, false);
        });
    });
});
//# sourceMappingURL=quotagrid.test.js.map