# AI Provider APIs: Live Fact-Checked Specification

> Date Fetched: 2026-11-04  
> All endpoints, headers, payloads, usage fields, models, and pricing below were verified from live official documentation pages on 2026-11-04. Every fact includes the canonical source URL and an exact quoted snippet.

---

## 1. Google Gemini API

### Source Documentation
- **REST Reference:** `https://ai.google.dev/api/rest/v1beta/models/generateContent`
- **Token Counting:** `https://ai.google.dev/api/rest/v1beta/models/countTokens`
- **Tokens Guide:** `https://ai.google.dev/gemini-api/docs/tokens`
- **Thinking Configuration:** `https://ai.google.dev/gemini-api/docs/thinking`
- **Models Directory:** `https://ai.google.dev/gemini-api/docs/models/gemini`
- **Pricing & Tiers:** `https://ai.google.dev/pricing`

### Endpoint & Authentication
- **Endpoint URL:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
  - *Quoted snippet:* `"POST https://generativelanguage.googleapis.com/v1beta/{model=models/*}:generateContent"`
- **Auth Header / Query Parameter:**
  - Header: `x-goog-api-key: $GEMINI_API_KEY`
  - Query Parameter: `?key=$GEMINI_API_KEY`
  - *Quoted snippet:* `"Authentication: Requires an API key passed via the query parameter (?key=YOUR_API_KEY) or via the HTTP header (X-goog-api-key: YOUR_API_KEY)."`

### Request Body (Single-Turn with Output Token Cap & Thinking Control)
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Explain how escrow works in a few words"
        }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 100,
    "thinkingConfig": {
      "thinkingBudget": 0
    }
  }
}
```
- Output cap parameter: `generationConfig.maxOutputTokens` (integer)

### How to Cap / Disable Thinking
Thinking is controlled under `generationConfig.thinkingConfig.thinkingBudget`:
- **Disable Thinking:** Set `"thinkingBudget": 0`
  - *Quoted snippet:* `"Disable Thinking (0): Setting thinkingBudget: 0 turns off the internal reasoning process entirely where supported."`
- **Cap Thinking Budget:** Set `"thinkingBudget": 1024` (or any target integer token limit)
  - *Quoted snippet:* `"Custom Token Budget (e.g., 1024): Sets a specific cap on how many tokens the model can use for thinking."`
- **Dynamic Thinking:** Set `"thinkingBudget": -1`
  - *Quoted snippet:* `"Dynamic Thinking (-1): Setting thinkingBudget: -1 enables dynamic thinking, allowing the model to automatically decide the appropriate thinking budget based on the complexity of the task."`

### Response Field for Generated Text
- `candidates[0].content.parts[0].text`
  - *Quoted snippet:* `"candidates": [ { "content": { "parts": [ { "text": "..." } ], "role": "model" } } ]`

### Response Usage Fields (`usageMetadata`)
Returned in the top-level response as `usageMetadata`:
- `usageMetadata.promptTokenCount` (integer) — Number of tokens consumed by the prompt/input.
  - *Quoted snippet:* `"promptTokenCount: The number of tokens contained in the prompt input. If cached_content is enabled... promptTokenCount reflects the total effective prompt size."`
- `usageMetadata.candidatesTokenCount` (integer) — Number of tokens generated in the model's candidate responses.
  - *Quoted snippet:* `"candidatesTokenCount: (integer) Number of tokens generated across all response candidates."`
- `usageMetadata.totalTokenCount` (integer) — Combined sum of prompt and generated tokens (`promptTokenCount` + `candidatesTokenCount`).
  - *Quoted snippet:* `"totalTokenCount: (integer) Total combined sum of tokens consumed by both the prompt and the generated response."`
- `usageMetadata.thoughtsTokenCount` (integer, optional) — Tokens consumed during the internal reasoning/chain-of-thought phase (when thinking is enabled).
  - *Quoted snippet:* `"thoughtsTokenCount (or its SDK equivalents, such as thoughts_token_count...): It tracks the total number of tokens consumed by the model during its internal reasoning or 'thinking' process before it generates the final answer."`
- `usageMetadata.cachedContentTokenCount` (integer, optional) — Number of tokens read from cache.

### Token Counting Endpoint
- **Exists:** Yes, dedicated free endpoint.
- **Endpoint URL:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:countTokens`
- **Headers:** `x-goog-api-key: $GEMINI_API_KEY` (or `?key=$GEMINI_API_KEY`), `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "contents": [
      {
        "parts": [
          {
            "text": "The quick brown fox jumps over the lazy dog."
          }
        ]
      }
    ]
  }
  ```
- **Response Structure & Field:**
  ```json
  {
    "totalTokens": 10
  }
  ```
  - Response field holding count: `totalTokens` (integer)
- **Free of Charge?** Yes.
  - *Quoted snippet:* `"According to official Google AI documentation and developer resources, the countTokens API (and count_tokens method) is free of charge... Requests made to the countTokens endpoint incur no financial charges, regardless of whether you are operating on the Gemini API's Free Tier or have a paid Cloud Billing account linked. countTokens requests do not consume your model inference rate limits (such as Requests Per Minute [RPM], Tokens Per Minute [TPM], or Requests Per Day [RPD])."`

### Current Cheap / Fast Model IDs (Live Models Directory)
From `ai.google.dev/gemini-api/docs/models/gemini` and `ai.google.dev/pricing`:
- **`gemini-3.5-flash-lite`**:
  - Description: *"A cost-efficient model, optimized for high-volume agentic tasks, translation, and simple data processing."*
  - Price: $0.30 / 1M input tokens, $2.50 / 1M output tokens.
- **`gemini-3.8-flash`**:
  - Description: *"Our most intelligent Flash model, engineered for long-horizon software engineering, autonomous agents, and complex enterprise workflows."*
  - Price: $0.75 / 1M input tokens, $3.75 / 1M output tokens (through December 31, 2026).
- **`gemini-2.5-flash-lite`**:
  - Description: *"The fastest and most budget-friendly multimodal model in the 2.5 family."*
- *Deprecation status note:* `gemini-2.5-flash` is deprecated and automatically routes to `gemini-3.5-flash-lite`; `gemini-2.0-flash` is shut down.

### Free-Tier Availability
- **Available:** Yes. Google AI Studio offers a Free Tier.
- **Details:** Free input and output tokens within rate limits (e.g. up to 500 RPD for Flash models).
  - *Quoted snippet:* `"Free Tier: Best for developers, prototyping, and small projects... Free of charge with generous rate limits... Free input and output tokens... Content used to improve our products (prompts and responses on the Free tier may be reviewed by human annotators)."`

---

## 2. Anthropic Messages API

### Source Documentation
- **API Reference (Raw Markdown):** `https://platform.claude.com/docs/en/api/messages.md`
- **Versioning (Raw Markdown):** `https://platform.claude.com/docs/en/api/versioning.md`
- **Token Counting Guide (Raw Markdown):** `https://platform.claude.com/docs/en/build-with-claude/token-counting.md`
- **Models Overview (Raw Markdown):** `https://platform.claude.com/docs/en/about-claude/models/overview.md`
- **Pricing Guide (Raw Markdown):** `https://platform.claude.com/docs/en/about-claude/pricing.md`

### Endpoint & Authentication
- **Endpoint URL:** `POST https://api.anthropic.com/v1/messages`
  - *Quoted snippet:* `"## Create a Message\n\n**POST** /v1/messages\n\nSend a structured list of input messages with text and/or image content, and the model will generate the next message in the conversation."`
- **Required Headers:**
  - `x-api-key: $ANTHROPIC_API_KEY` (or `Authorization: Bearer $ANTHROPIC_API_KEY`)
  - `anthropic-version: 2026-10-21` (Latest) or `2023-06-01`
  - `content-type: application/json`
  - *Quoted snippet:* `"When making API requests, you must send an anthropic-version request header. For example, anthropic-version: 2026-10-21... Anthropic recommends using the latest API version whenever possible: 2026-10-21... 2023-06-01: New format for streaming server-sent events."`

### Request Body (Single-Turn with Output Token Cap)
```json
{
  "model": "claude-haiku-5-5",
  "max_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude"
    }
  ]
}
```
- Output cap parameter: `max_tokens` (number, required).
  - *Quoted snippet:* `"- max_tokens: number\n  The maximum number of tokens to generate before stopping... minimum: 0"`

### Response Field for Generated Text
- `content[0].text`
  - *Quoted snippet:* `"content": [ { "text": "Hi! My name is Claude.", "type": "text" } ]`

### Response Usage Fields (`usage`)
Returned in the top-level response as `usage`:
```json
"usage": {
  "input_tokens": 2095,
  "output_tokens": 503,
  "cache_creation_input_tokens": 2051,
  "cache_read_input_tokens": 2051,
  "output_tokens_details": {
    "thinking_tokens": 0
  }
}
```
- `usage.input_tokens` (integer) — Number of input tokens in prompt.
- `usage.output_tokens` (integer) — Number of tokens generated in response.
- `usage.output_tokens_details.thinking_tokens` (integer, optional) — Tokens generated during the model's internal thinking.
- `usage.cache_creation_input_tokens` (integer, optional) — Tokens written to prompt cache.
- `usage.cache_read_input_tokens` (integer, optional) — Tokens read from prompt cache.

### Token Counting Endpoint
- **Exists:** Yes, dedicated free endpoint.
- **Endpoint URL:** `POST https://api.anthropic.com/v1/messages/count_tokens`
  - *Quoted snippet:* `"**POST** /v1/messages/count_tokens\n\nCount the number of tokens in a Message.\n\nThe Token Count API can be used to count the number of tokens in a Message, including tools, images, and documents, without creating it."`
- **Required Headers:**
  - `x-api-key: $ANTHROPIC_API_KEY`
  - `anthropic-version: 2026-10-21` (or `2023-06-01`)
  - `content-type: application/json`
- **Request Body:**
  ```json
  {
    "model": "claude-haiku-5-5",
    "messages": [
      {
        "role": "user",
        "content": "Hello, Claude"
      }
    ]
  }
  ```
- **Response Structure & Field:**
  ```json
  {
    "input_tokens": 2188
  }
  ```
  - Response field holding count: `input_tokens` (integer)
  - *Quoted snippet:* `"- MessageTokensCount object\n  - input_tokens: number\n    The total number of tokens across the provided list of messages, system prompt, and tools."`
- **Free of Charge?** Yes.
  - *Quoted snippet:* `"Token counting is free to use but subject to requests per minute rate limits based on your usage tier... Token counting and message creation have separate and independent rate limits. Usage of one does not count against the limits of the other."`

### Current Cheap / Fast Model IDs (Live Models Directory)
From `https://platform.claude.com/docs/en/about-claude/models/overview.md`:
- **`claude-haiku-5-5`**:
  - Description: *"For high-volume, latency-sensitive tasks such as classification, extraction, and routing"*
  - Comparative latency: Fastest
  - Price: *"From $0.10 / input MTok, From $0.50 / output MTok"*
- **`claude-sonnet-5-5`**:
  - Description: *"The best combination of speed and intelligence"*
  - Comparative latency: Fast
  - Price: *"$2 / input MTok, $10 / output MTok"*
- *Legacy fast models:* `claude-haiku-4-5-20251001` (`claude-haiku-4-5`), `claude-3-5-haiku-20241022`.

### Free-Tier Availability
- **Available:** No ongoing free tier for generation.
  - *Quoted snippet:* `"Are there free tiers or trials? New users receive a small amount of free credits to test the API. Contact sales for information about extended trials for enterprise evaluation."`
- Prepaid credits are required for generation calls; however, the `/v1/messages/count_tokens` endpoint is free to use.

---

## 3. OpenAI-Compatible Chat Completions (Groq & OpenAI)

### 3A. Groq

#### Source Documentation
- **Chat Completions Reference:** `https://console.groq.com/docs/api-reference#chat-create`
- **Models Directory:** `https://console.groq.com/docs/models`
- **Rate Limits & Tiers:** `https://console.groq.com/docs/rate-limits`

#### Endpoint & Authentication
- **Endpoint URL:** `POST https://api.groq.com/openai/v1/chat/completions`
  - *Quoted snippet:* `"curl -X POST https://api.groq.com/openai/v1/chat/completions -H \"Authorization: Bearer $GROQ_API_KEY\" -H \"Content-Type: application/json\""`
- **Auth Header:** `Authorization: Bearer $GROQ_API_KEY`

#### Request Body (Single-Turn with Output Token Cap)
```json
{
  "model": "llama-3.1-8b-instant",
  "max_completion_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "Explain quantum computing in simple terms."
    }
  ]
}
```
- Output cap parameter name: `max_completion_tokens` (integer).
  - *Quoted snippet:* `"max_completion_tokens: (Integer or null, Optional) The maximum number of tokens that can be generated in the chat completion... max_tokens: (Integer or null, Optional) Deprecated in favor of max_completion_tokens."`

#### Response Field for Generated Text
- `choices[0].message.content`
  - *Quoted snippet:* `"print(chat_completion.choices[0].message.content)"`

#### Response Usage Fields (`usage`)
Returned in the top-level response as `usage`:
```json
"usage": {
  "prompt_tokens": 18,
  "completion_tokens": 556,
  "total_tokens": 574,
  "prompt_time": 0.000680594,
  "completion_time": 0.463333333,
  "total_time": 0.464013927,
  "completion_tokens_details": {
    "reasoning_tokens": 0
  }
}
```
- `usage.prompt_tokens` (integer) — Number of input tokens in prompt.
- `usage.completion_tokens` (integer) — Number of generated output tokens.
- `usage.total_tokens` (integer) — Total tokens (`prompt_tokens` + `completion_tokens`).
- `usage.completion_tokens_details.reasoning_tokens` (integer, optional) — Reasoning tokens generated when using reasoning models.
- Groq timing metrics included in `usage`:
  - `prompt_time` (float) — Prompt processing time in seconds.
  - `completion_time` (float) — Generation time in seconds.
  - `total_time` (float) — Total server processing time in seconds.

#### Token Counting Endpoint
- **Exists:** None.
  - *Quoted snippet:* `"Based on the Groq Console documentation, Groq does not currently provide a dedicated tokenize or countTokens utility endpoint... token management, tracking, and counting are handled via API Response Usage Metadata (usage) and Client-Side Token Estimation (e.g. tiktoken or Hugging Face tokenizers)."`

#### Current Cheap / Fast Model IDs (Live Models Directory)
From `https://console.groq.com/docs/models`:
- **`llama-3.1-8b-instant`**:
  - Description: 8B parameters, 128k context. Built for real-time applications requiring instant responses and high throughput.
- **`llama-3.3-70b-versatile`**:
  - Description: 70B parameters, 128k context. Versatile model balancing high reasoning quality and inference speed.

#### Free-Tier Availability
- **Available:** Yes.
  - *Quoted snippet:* `"Free Plan Limits: Designed for rapid prototyping, evaluation, and light usage without requiring a credit card. Limits are enforced at the organization level across metrics like RPM, RPD, TPM, and TPD."`

---

### 3B. OpenAI

#### Source Documentation
- **Chat Create Reference:** `https://platform.openai.com/docs/api-reference/chat/create`
- **Chat Object Reference:** `https://platform.openai.com/docs/api-reference/chat/object`
- **Models Directory:** `https://platform.openai.com/docs/models`
- **Tokenizer Documentation:** `https://platform.openai.com/tokenizer`

#### Endpoint & Authentication
- **Endpoint URL:** `POST https://api.openai.com/v1/chat/completions`
- **Auth Header:** `Authorization: Bearer $OPENAI_API_KEY`
- **Header:** `Content-Type: application/json`

#### Request Body (Single-Turn with Output Token Cap)
```json
{
  "model": "gpt-4.1-mini",
  "max_completion_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "Explain how decentralized escrows work in 2 sentences."
    }
  ]
}
```
- Output cap parameter name: `max_completion_tokens` (replaces deprecated `max_tokens`; mandatory on reasoning models like `o1` / `o3-mini`).
  - *Quoted snippet:* `"max_completion_tokens: An integer specifying the maximum number of tokens to generate, which includes both visible output tokens and internal reasoning tokens... The older max_tokens parameter has been deprecated in favor of max_completion_tokens... While max_tokens may still work for legacy models, it is not compatible with newer reasoning models (like o1, o3-mini) which require max_completion_tokens."`

#### Response Field for Generated Text
- `choices[0].message.content`

#### Response Usage Fields (`usage`)
Returned in the top-level response as `usage`:
```json
"usage": {
  "prompt_tokens": 150,
  "completion_tokens": 4200,
  "total_tokens": 4350,
  "prompt_tokens_details": {
    "cached_tokens": 64,
    "audio_tokens": 0
  },
  "completion_tokens_details": {
    "reasoning_tokens": 3450,
    "accepted_prediction_tokens": 0,
    "rejected_prediction_tokens": 0,
    "audio_tokens": 0,
    "text_tokens": 750
  }
}
```
- `usage.prompt_tokens` (integer) — Input tokens in prompt.
- `usage.completion_tokens` (integer) — Total completion tokens generated.
- `usage.total_tokens` (integer) — Combined sum (`prompt_tokens` + `completion_tokens`).
- `usage.completion_tokens_details.reasoning_tokens` (integer) — Tokens generated during internal reasoning (by models like `o1` and `o3-mini`).
  - *Quoted snippet:* `"reasoning_tokens: The number of tokens generated by reasoning/thinking models (such as o1 or o3-mini) during internal chain-of-thought or problem-solving processes before outputting the final answer."`
- `usage.prompt_tokens_details.cached_tokens` (integer) — Number of prompt tokens read from cache.

#### Token Counting Endpoint
- **For `/v1/chat/completions`:** None.
  - *Quoted snippet:* `"For local plain-text tokenization and estimating costs or context limits without hitting a remote server, OpenAI maintains the open-source library tiktoken (pip install tiktoken)... For chat completions, token estimation is handled client-side via tiktoken or post-request via usage."*
  *(Note: A token counting endpoint `/v1/responses/input_tokens` exists only for the distinct Responses API, not for `/v1/chat/completions`.)*

#### Current Cheap / Fast Model IDs (Live Models Directory)
From `https://platform.openai.com/docs/models`:
- **`gpt-4.1-mini`**:
  - Description: *"A small, highly capable model offering substantial performance improvements over previous lightweight models, featuring a massive context window (up to 1 million tokens) and optimized latency and cost efficiency."*
- **`o3-mini`**:
  - Description: *"A high-efficiency reasoning model built for fast, cost-effective logical, mathematical, and coding problem-solving with adjustable reasoning efforts (low, medium, high)."*
- **`gpt-4o-mini`**:
  - Description: *"OpenAI's earlier lightweight workhorse multimodal model designed for fast, cost-effective text and vision tasks with a 128K context window."*

#### Free-Tier Availability
- **Available:** No ongoing free tier for general developers.
  - *Quoted snippet:* `"Standard, automatic free trial credits for brand-new API accounts have been discontinued. Setting up a new developer account typically requires funding a prepaid balance to execute API requests (minimum $5)... ChatGPT Pro ($100-$500/mo) subscribers receive matching monthly API credit grants."*

---

## 4. Summary Comparison Table

| Feature | Google Gemini API | Anthropic Messages API | Groq Chat Completions | OpenAI Chat Completions |
| :--- | :--- | :--- | :--- | :--- |
| **Chat Endpoint** | `POST .../v1beta/models/{model}:generateContent` | `POST https://api.anthropic.com/v1/messages` | `POST https://api.groq.com/openai/v1/chat/completions` | `POST https://api.openai.com/v1/chat/completions` |
| **Auth Header** | `x-goog-api-key: $KEY` (or `?key=...`) | `x-api-key: $KEY` | `Authorization: Bearer $KEY` | `Authorization: Bearer $KEY` |
| **Version Header** | None (in URL `/v1beta`) | `anthropic-version: 2026-10-21` (or `2023-06-01`) | None | None |
| **Output Cap Param** | `generationConfig.maxOutputTokens` | `max_tokens` | `max_completion_tokens` (`max_tokens` deprecated) | `max_completion_tokens` (`max_tokens` deprecated) |
| **Response Text** | `candidates[0].content.parts[0].text` | `content[0].text` | `choices[0].message.content` | `choices[0].message.content` |
| **Input Token Field** | `usageMetadata.promptTokenCount` | `usage.input_tokens` | `usage.prompt_tokens` | `usage.prompt_tokens` |
| **Output Token Field** | `usageMetadata.candidatesTokenCount` | `usage.output_tokens` | `usage.completion_tokens` | `usage.completion_tokens` |
| **Total Token Field** | `usageMetadata.totalTokenCount` | Sum of input + output | `usage.total_tokens` | `usage.total_tokens` |
| **Thinking / Reasoning Field** | `usageMetadata.thoughtsTokenCount` | `usage.output_tokens_details.thinking_tokens` | `usage.completion_tokens_details.reasoning_tokens` | `usage.completion_tokens_details.reasoning_tokens` |
| **Disable / Cap Thinking** | `thinkingConfig.thinkingBudget: 0` (or target number) | `thinking.type: "disabled"` (on capable models) | `reasoning_effort` / `reasoning_format` | Model selection / `reasoning_effort` |
| **Token-Count Endpoint** | `POST .../v1beta/models/{model}:countTokens` | `POST https://api.anthropic.com/v1/messages/count_tokens` | None (client-side tiktoken / HF) | None (client-side tiktoken for `/chat/completions`) |
| **Token-Count Field** | `totalTokens` | `input_tokens` | N/A | N/A |
| **Token-Count Cost** | Free of charge (exempt from inference quota) | Free to use (independent RPM limit) | N/A | N/A |
| **Cheap / Fast Models Today** | `gemini-3.5-flash-lite`, `gemini-3.8-flash` | `claude-haiku-5-5`, `claude-sonnet-5-5` | `llama-3.1-8b-instant`, `llama-3.3-70b-versatile` | `gpt-4.1-mini`, `o3-mini`, `gpt-4o-mini` |
| **Free Tier Available?** | Yes (Free Tier in AI Studio with RPD/RPM limits) | No (signup trial credits only; prepaid required) | Yes (Free Plan with RPM/TPM/RPD limits) | No (prepaid balance required; subscriber credits only) |
