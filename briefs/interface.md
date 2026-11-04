# Shared interface (fixed — contract, web and api must all match this exactly)

## Contract `QuotaGrid` (Solidity, native MON)
Status enum values: 0 None, 1 Open, 2 Settled, 3 Cancelled, 4 Reclaimed.
`cost(tokens) = ceil(tokens * pricePerKToken / 1000)` (wei). Request and listing ids start at 1.

Human-readable ABI (viem `parseAbi` format) — the contract MUST expose exactly these signatures:
```ts
export const quotaGridAbi = parseAbi([
  'constructor(address operator, uint16 feeBps)',
  'function owner() view returns (address)',
  'function operator() view returns (address)',
  'function feeBps() view returns (uint16)',
  'function RECLAIM_DELAY() view returns (uint64)',
  'function listingCount() view returns (uint256)',
  'function requestCount() view returns (uint256)',
  'function balances(address) view returns (uint256)',
  'function protocolFees() view returns (uint256)',
  'function getListing(uint256 id) view returns ((address seller, string provider, string model, uint256 pricePerKToken, uint256 quotaTotal, uint256 quotaUsed, uint256 quotaLocked, bool active, bytes encryptedKey))',
  'function getRequest(uint256 id) view returns ((uint256 listingId, address buyer, uint256 tMax, uint256 deposit, bytes32 promptHash, uint64 openedAt, uint8 status, uint256 tUsed))',
  'function quote(uint256 listingId, uint256 tokens) view returns (uint256)',
  'function available(uint256 listingId) view returns (uint256)',
  'function createListing(string provider, string model, uint256 pricePerKToken, uint256 quota, bytes encryptedKey) returns (uint256)',
  'function updateListing(uint256 id, uint256 pricePerKToken, uint256 addQuota, bool active)',
  'function openRequest(uint256 listingId, uint256 tMax, bytes32 promptHash) payable returns (uint256)',
  'function settle(uint256 requestId, uint256 tUsed)',
  'function cancel(uint256 requestId)',
  'function reclaim(uint256 requestId)',
  'function withdraw()',
  'function withdrawFees(address to)',
  'function setOperator(address op)',
  'function setFeeBps(uint16 bps)',
  'event ListingCreated(uint256 indexed listingId, address indexed seller, string provider, string model, uint256 pricePerKToken, uint256 quota)',
  'event ListingUpdated(uint256 indexed listingId, uint256 pricePerKToken, uint256 quotaTotal, bool active)',
  'event RequestOpened(uint256 indexed requestId, uint256 indexed listingId, address indexed buyer, uint256 tMax, uint256 deposit, bytes32 promptHash)',
  'event RequestSettled(uint256 indexed requestId, uint256 tUsed, uint256 sellerPayout, uint256 fee, uint256 refund)',
  'event RequestCancelled(uint256 indexed requestId, uint256 refund)',
  'event Withdrawn(address indexed seller, uint256 amount)',
])
```
Semantics:
- `createListing`: seller = msg.sender, active = true, requires price > 0, quota > 0, encryptedKey non-empty.
- `updateListing`: seller only; sets price, `quotaTotal += addQuota`, sets active.
- `available = quotaTotal - quotaUsed - quotaLocked`.
- `openRequest`: listing active, `tMax > 0`, `available >= tMax`, `msg.value >= quote(listingId,tMax)`. deposit = msg.value
  (any excess is refunded at settlement). Locks `tMax` quota. openedAt = block.timestamp.
- `settle` (operator only, status Open, `tUsed <= tMax`): costUsed = quote(listingId,tUsed); fee = costUsed*feeBps/10000;
  `balances[seller] += costUsed - fee`; `protocolFees += fee`; refund = deposit - costUsed sent to buyer with `call`
  (if the call fails, credit `balances[buyer]` instead — never revert); `quotaLocked -= tMax; quotaUsed += tUsed`.
- `cancel` (operator only, Open): full deposit refund (same fallback), unlock quota.
- `reclaim` (buyer only, Open, `block.timestamp >= openedAt + RECLAIM_DELAY`, RECLAIM_DELAY = 600): full refund, unlock.
- `withdraw`: sends `balances[msg.sender]` (zero → revert), emits Withdrawn. `withdrawFees(to)`: owner only.
- `setFeeBps`: owner, max 1000. `setOperator`: owner.
- Reentrancy guard on every function that sends value. Custom errors. Solidity ^0.8.24.

## Environment variables (web/.env.local; example in web/.env.example)
| Var | Used by | Meaning |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | web+api | Monad testnet chain id (verified value from docs/research/monad.md) |
| `NEXT_PUBLIC_RPC_URL` | web+api | Monad testnet RPC |
| `NEXT_PUBLIC_EXPLORER_URL` | web | explorer base URL, tx link = `${url}/tx/${hash}` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | web+api | deployed QuotaGrid |
| `OPERATOR_PRIVATE_KEY` | api | 0x… key of the operator wallet (calls settle/cancel) |
| `OPERATOR_RSA_PRIVATE_KEY` | api | base64 of a PKCS#8 PEM RSA-2048 private key |

## Shared web files (owned by `web` job; `api` job imports them, does not edit them)
- `web/src/lib/abi.ts` — exports `quotaGridAbi` exactly as above.
- `web/src/lib/chain.ts` — exports `monad` (viem's `monadTestnet` from `viem/chains`, with rpc/explorer overridable by env vars: id, name "Monad Testnet",
  nativeCurrency {name:"Monad", symbol:"MON", decimals:18}, rpcUrls, blockExplorers) and `CONTRACT_ADDRESS` (`0x${string}`)
  and `explorerTx(hash)`, `explorerAddress(addr)`.
- `web/src/lib/types.ts` — `Listing`, `Request` TS types matching the tuples above; `Provider = 'gemini' | 'anthropic' | 'openai-compatible'`.

## API routes (owned by `api` job)
- `GET /api/operator-key` → `{ publicKeyPem: string, operator: address }` (RSA public key in SPKI PEM derived from
  OPERATOR_RSA_PRIVATE_KEY; operator address derived from OPERATOR_PRIVATE_KEY).
- **Payload (D-013):** every prompt is a canonical JSON string `payload` =
  `JSON.stringify({v:1, system?: string, messages:[{role:'user'|'assistant', content:string}]})` (keys in exactly that
  order, `system` omitted when empty). `promptHash = keccak256(toBytes(payload))`. Shared helpers in
  `web/src/lib/payload.ts`: `buildPayload({system?, messages})` and `parsePayload(str)` (validates; max 16000 chars total).
- `POST /api/quote` body `{ listingId: string, payload: string, maxOutputTokens: number }` →
  `{ inputTokens: number, inputTokensExact: boolean, tMax: string, costWei: string }`.
  tMax = inputTokens + maxOutputTokens (+ thinking budget if the provider requires it). Uses the provider's free
  token-count endpoint when it has one (exact), otherwise an estimate (ceil(chars/3) + 16).
- `POST /api/execute` body `{ requestId: string, payload: string, maxOutputTokens: number }` → `{ output: string, tUsed: string, settleTx: string,
  sellerPayout: string, fee: string, refund: string }` or on provider failure `{ error, cancelTx }`.
  Checks on-chain: request Open, `keccak256(toBytes(payload)) == promptHash`. Multi-turn messages + system are passed to
  the provider natively (Gemini `systemInstruction`/`contents` with role model for assistant; Anthropic `system`/`messages`;
  OpenAI-compatible `messages` with a system message). Calls provider with output cap
  `tMax - inputTokens`; tUsed = provider-reported input+output(+thinking) tokens, clamped to tMax. Sends `settle` with
  operator wallet, waits for receipt, decodes RequestSettled. On provider error → `cancel`.
- Browser encryption of the seller key (in the `web` job's sell page): fetch `/api/operator-key`, import SPKI with
  WebCrypto `RSA-OAEP` / `SHA-256`, encrypt the UTF-8 key, pass bytes as hex to `createListing`. The `api` job decrypts with
  Node `crypto.privateDecrypt({key, padding: RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256'})`.
