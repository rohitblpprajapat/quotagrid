import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { formatEther } from 'viem';
import { QuotaGridClient, type CompleteResult } from './core.js';
import {
  openAiToPayload,
  geminiToPayload,
  type OpenAiChatRequest,
  type GeminiGenerateRequest,
} from './converters.js';
import { isQuotaError } from './fallback.js';

export interface ProxyOptions {
  port?: number;
  host?: string;
  models?: string[];
  maxPricePerKTokenMON?: number;
  primary?: 'openai' | 'gemini';
  primaryBaseUrl?: string;
  primaryKeyEnv?: string;
  budget?: number;
  threshold?: number;
  client?: QuotaGridClient;
}

export function startProxyServer(opts: ProxyOptions = {}): http.Server {
  const port = opts.port ?? 8787;
  const host = opts.host ?? '127.0.0.1';
  const defaultModels = opts.models && opts.models.length > 0
    ? opts.models
    : ['gemini-3.5-flash-lite', 'llama-3.1-8b-instant'];

  let remainingBudget = opts.budget ?? Infinity;
  const threshold = opts.threshold ?? 0;
  let switchedToQuotaGrid = false;
  let switchReason: string = '';

  const client = opts.client || new QuotaGridClient();

  const readBody = (req: IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });

  const sendJson = (res: ServerResponse, status: number, data: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end(JSON.stringify(data));
  };

  const sendOpenAiError = (res: ServerResponse, status: number, message: string) => {
    sendJson(res, status, {
      error: {
        message,
        type: 'quotagrid_error',
        code: status,
      },
    });
  };

  const sendGeminiError = (res: ServerResponse, status: number, message: string) => {
    sendJson(res, status, {
      error: {
        code: status,
        message,
        status: status === 429 ? 'RESOURCE_EXHAUSTED' : 'INTERNAL',
      },
    });
  };

  const callPrimaryProvider = async (
    provider: 'openai' | 'gemini',
    reqData: {
      model: string;
      system?: string;
      messages: { role: 'user' | 'assistant'; content: string }[];
      maxOutputTokens: number;
    }
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> => {
    const keyEnvName = opts.primaryKeyEnv || (provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY');
    const apiKey = process.env[keyEnvName];
    if (!apiKey) {
      throw new Error(`Primary provider key env var ${keyEnvName} is not set`);
    }

    if (provider === 'gemini') {
      const baseUrl = opts.primaryBaseUrl || 'https://generativelanguage.googleapis.com/v1beta';
      const url = `${baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(reqData.model)}:generateContent?key=${apiKey}`;

      const contents = reqData.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const body: any = {
        contents,
        generationConfig: { maxOutputTokens: reqData.maxOutputTokens },
      };
      if (reqData.system) {
        body.systemInstruction = { parts: [{ text: reqData.system }] };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const errText = await res.text();
        const err: any = new Error(`Gemini primary failed (${res.status}): ${errText}`);
        err.status = res.status;
        throw err;
      }

      const data: any = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
      const inputTokens = data.usageMetadata?.promptTokenCount || 0;
      const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
      return { text, inputTokens, outputTokens };
    } else {
      // OpenAI
      const baseUrl = opts.primaryBaseUrl || 'https://api.openai.com/v1';
      const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

      const messages: any[] = [];
      if (reqData.system) {
        messages.push({ role: 'system', content: reqData.system });
      }
      for (const m of reqData.messages) {
        messages.push({ role: m.role, content: m.content });
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: reqData.model,
          messages,
          max_completion_tokens: reqData.maxOutputTokens,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const errText = await res.text();
        const err: any = new Error(`OpenAI primary failed (${res.status}): ${errText}`);
        err.status = res.status;
        throw err;
      }

      const data: any = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      return { text, inputTokens, outputTokens };
    }
  };

  const server = http.createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${host}:${port}`);
    const pathname = parsedUrl.pathname;

    try {
      // 1. GET /v1/models (OpenAI-compatible list of models on QuotaGrid)
      if (req.method === 'GET' && pathname === '/v1/models') {
        try {
          const listings = await client.listListings();
          const activeListings = listings.filter((l) => l.active && l.available > 0n);
          const distinctModels = Array.from(new Set(activeListings.map((l) => l.model)));

          const modelsList = (distinctModels.length > 0 ? distinctModels : defaultModels).map(
            (modelId) => ({
              id: modelId,
              object: 'model',
              created: Math.floor(Date.now() / 1000),
              owned_by: 'quotagrid',
              permission: [],
              root: modelId,
              parent: null,
            })
          );

          sendJson(res, 200, {
            object: 'list',
            data: modelsList,
          });
          return;
        } catch (err: any) {
          sendOpenAiError(res, 500, `Failed to fetch listings from contract: ${err?.message}`);
          return;
        }
      }

      // 2. POST /v1/chat/completions (OpenAI-compatible)
      if (req.method === 'POST' && pathname === '/v1/chat/completions') {
        const rawBody = await readBody(req);
        let parsed: OpenAiChatRequest;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          sendOpenAiError(res, 400, 'Invalid JSON body');
          return;
        }

        const { system, messages, maxOutputTokens } = openAiToPayload(parsed);
        const requestedModel = parsed.model || defaultModels[0];
        const modelOrder = [
          requestedModel,
          ...defaultModels.filter((m) => m !== requestedModel),
        ];

        let route: 'primary' | 'quotagrid' = 'quotagrid';
        let reason = 'direct';
        let text = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let totalTokens = 0;
        let qgResult: CompleteResult | undefined = undefined;

        // Check if primary is configured and not yet switched
        if (opts.primary && !switchedToQuotaGrid) {
          if (remainingBudget < threshold) {
            switchedToQuotaGrid = true;
            switchReason = `budget_below_threshold (${remainingBudget} < ${threshold})`;
            route = 'quotagrid';
            reason = switchReason;
          } else {
            try {
              const primaryRes = await callPrimaryProvider(opts.primary, {
                model: requestedModel,
                system,
                messages,
                maxOutputTokens,
              });

              text = primaryRes.text;
              inputTokens = primaryRes.inputTokens;
              outputTokens = primaryRes.outputTokens;
              totalTokens = inputTokens + outputTokens;
              remainingBudget -= totalTokens;
              route = 'primary';
              reason = 'budget_ok';
            } catch (primaryErr: any) {
              if (isQuotaError(primaryErr)) {
                switchedToQuotaGrid = true;
                switchReason = `quota_error: ${primaryErr.message}`;
                route = 'quotagrid';
                reason = switchReason;
              } else {
                sendOpenAiError(res, primaryErr.status || 500, primaryErr.message);
                return;
              }
            }
          }
        }

        if (route === 'quotagrid') {
          try {
            qgResult = await client.complete({
              system,
              messages,
              maxOutputTokens,
              models: modelOrder,
              maxPricePerKTokenMON: opts.maxPricePerKTokenMON,
            });

            text = qgResult.text;
            inputTokens = Number(qgResult.tMax - BigInt(maxOutputTokens));
            outputTokens = Number(qgResult.tUsed);
            totalTokens = Number(qgResult.tUsed);
          } catch (err: any) {
            sendOpenAiError(res, 500, err?.message || 'QuotaGrid execution error');
            return;
          }
        }

        const txLink = qgResult ? `https://testnet.monadvision.com/tx/${qgResult.openTx}` : '';
        console.log(
          `[Proxy] route=${route} reason=${reason} tokens=${totalTokens} ${txLink ? `tx=${txLink}` : ''}`
        );

        const responseId = `chatcmpl-quotagrid-${qgResult ? qgResult.requestId : Date.now()}`;
        const created = Math.floor(Date.now() / 1000);

        // Streaming response (SSE)
        if (parsed.stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });

          const chunk1 = {
            id: responseId,
            object: 'chat.completion.chunk',
            created,
            model: requestedModel,
            choices: [
              {
                index: 0,
                delta: { role: 'assistant', content: text },
                finish_reason: null,
              },
            ],
          };
          res.write(`data: ${JSON.stringify(chunk1)}\n\n`);

          const chunk2 = {
            id: responseId,
            object: 'chat.completion.chunk',
            created,
            model: requestedModel,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: 'stop',
              },
            ],
            ...(qgResult
              ? {
                  quotagrid: {
                    requestId: qgResult.requestId.toString(),
                    openTx: qgResult.openTx,
                    settleTx: qgResult.settleTx,
                    openTxUrl: `https://testnet.monadvision.com/tx/${qgResult.openTx}`,
                    settleTxUrl: `https://testnet.monadvision.com/tx/${qgResult.settleTx}`,
                  },
                }
              : {}),
          };
          res.write(`data: ${JSON.stringify(chunk2)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        // Standard JSON response
        const openAiResponse: any = {
          id: responseId,
          object: 'chat.completion',
          created,
          model: requestedModel,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: text,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            total_tokens: totalTokens,
          },
        };

        if (qgResult) {
          openAiResponse.quotagrid = {
            requestId: qgResult.requestId.toString(),
            listingId: qgResult.listingId.toString(),
            openTx: qgResult.openTx,
            settleTx: qgResult.settleTx,
            openTxUrl: `https://testnet.monadvision.com/tx/${qgResult.openTx}`,
            settleTxUrl: `https://testnet.monadvision.com/tx/${qgResult.settleTx}`,
            depositMON: formatEther(qgResult.depositWei),
            refundMON: formatEther(qgResult.refundWei),
            costMON: formatEther(qgResult.depositWei - qgResult.refundWei),
          };
        }

        sendJson(res, 200, openAiResponse);
        return;
      }

      // 3. POST /v1beta/models/{model}:generateContent (Gemini-compatible)
      const geminiMatch = pathname.match(/^\/v1beta\/models\/([^:]+):(generateContent|streamGenerateContent)/);
      if (req.method === 'POST' && geminiMatch) {
        const modelParam = decodeURIComponent(geminiMatch[1]);
        const isStream = geminiMatch[2] === 'streamGenerateContent';

        const rawBody = await readBody(req);
        let parsed: GeminiGenerateRequest;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          sendGeminiError(res, 400, 'Invalid JSON body');
          return;
        }

        const { system, messages, maxOutputTokens } = geminiToPayload(parsed);
        const modelOrder = [
          modelParam,
          ...defaultModels.filter((m) => m !== modelParam),
        ];

        let route: 'primary' | 'quotagrid' = 'quotagrid';
        let reason = 'direct';
        let text = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let totalTokens = 0;
        let qgResult: CompleteResult | undefined = undefined;

        if (opts.primary && !switchedToQuotaGrid) {
          if (remainingBudget < threshold) {
            switchedToQuotaGrid = true;
            switchReason = `budget_below_threshold (${remainingBudget} < ${threshold})`;
            route = 'quotagrid';
            reason = switchReason;
          } else {
            try {
              const primaryRes = await callPrimaryProvider(opts.primary, {
                model: modelParam,
                system,
                messages,
                maxOutputTokens,
              });

              text = primaryRes.text;
              inputTokens = primaryRes.inputTokens;
              outputTokens = primaryRes.outputTokens;
              totalTokens = inputTokens + outputTokens;
              remainingBudget -= totalTokens;
              route = 'primary';
              reason = 'budget_ok';
            } catch (primaryErr: any) {
              if (isQuotaError(primaryErr)) {
                switchedToQuotaGrid = true;
                switchReason = `quota_error: ${primaryErr.message}`;
                route = 'quotagrid';
                reason = switchReason;
              } else {
                sendGeminiError(res, primaryErr.status || 500, primaryErr.message);
                return;
              }
            }
          }
        }

        if (route === 'quotagrid') {
          try {
            qgResult = await client.complete({
              system,
              messages,
              maxOutputTokens,
              models: modelOrder,
              maxPricePerKTokenMON: opts.maxPricePerKTokenMON,
            });

            text = qgResult.text;
            inputTokens = Number(qgResult.tMax - BigInt(maxOutputTokens));
            outputTokens = Number(qgResult.tUsed);
            totalTokens = Number(qgResult.tUsed);
          } catch (err: any) {
            sendGeminiError(res, 500, err?.message || 'QuotaGrid execution error');
            return;
          }
        }

        const txLink = qgResult ? `https://testnet.monadvision.com/tx/${qgResult.openTx}` : '';
        console.log(
          `[Proxy] route=${route} reason=${reason} tokens=${totalTokens} ${txLink ? `tx=${txLink}` : ''}`
        );

        const geminiResponse: any = {
          candidates: [
            {
              content: {
                parts: [{ text }],
                role: 'model',
              },
              finishReason: 'STOP',
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: inputTokens,
            candidatesTokenCount: outputTokens,
            totalTokenCount: totalTokens,
          },
        };

        if (qgResult) {
          geminiResponse.quotagrid = {
            requestId: qgResult.requestId.toString(),
            openTx: qgResult.openTx,
            settleTx: qgResult.settleTx,
            openTxUrl: `https://testnet.monadvision.com/tx/${qgResult.openTx}`,
            settleTxUrl: `https://testnet.monadvision.com/tx/${qgResult.settleTx}`,
            depositMON: formatEther(qgResult.depositWei),
            refundMON: formatEther(qgResult.refundWei),
            costMON: formatEther(qgResult.depositWei - qgResult.refundWei),
          };
        }

        if (isStream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });
          res.write(`data: ${JSON.stringify(geminiResponse)}\n\n`);
          res.end();
          return;
        }

        sendJson(res, 200, geminiResponse);
        return;
      }

      // 404 for unknown routes
      sendOpenAiError(res, 404, `Not found: ${req.method} ${pathname}`);
    } catch (err: any) {
      sendOpenAiError(res, 500, err?.message || 'Internal proxy error');
    }
  });

  server.listen(port, host, () => {
    console.log(`[QuotaGrid Proxy] Listening on http://${host}:${port}`);
    console.log(`- OpenAI endpoint: http://${host}:${port}/v1/chat/completions`);
    console.log(`- Gemini endpoint: http://${host}:${port}/v1beta/models/{model}:generateContent`);
    console.log(`- Models list:     http://${host}:${port}/v1/models`);
  });

  return server;
}
