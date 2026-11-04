## Goal
Build the seller flow of QuotaGrid: list unused AI API quota without revealing the key, manage listings, withdraw
earnings.

## Context
Read `briefs/ui-shared.md` (use ONLY the shared exports listed there — another worker is writing them right now; import
them by the exact names), `briefs/interface.md`, `decisions.md` D-005/D-006.

## Do
Create exactly: `web/src/app/sell/page.tsx`, `web/src/components/sell/CreateListingForm.tsx`,
`web/src/components/sell/MyListings.tsx`, `web/src/components/sell/Earnings.tsx`.
1. `CreateListingForm`: provider `Select` (gemini | anthropic | openai-compatible), model id `Input` with suggestions per
   provider shown as clickable chips (Gemini: gemini-2.5-flash, gemini-2.5-flash-lite; Anthropic: claude-haiku-4-5;
   Groq: llama-3.3-70b-versatile — label these "suggestions, check your provider" since availability varies), price per
   1k tokens in MON (default "0.001"), quota tokens (default 100000), API key (password input, autocomplete off).
   Submit: `getOperatorKey()` → `encryptForOperator(publicKeyPem, apiKey)` → wagmi `writeContract` `createListing(provider,
   model, parseMON(price), BigInt(quota), encryptedHex)` → wait receipt → success with `TxLink` + new listing id (from
   `ListingCreated` log). Clear the key field from state immediately after encrypting. Explain under the field:
   "Encrypted in your browser to the operator's public key. Stored on-chain only as ciphertext."
2. `MyListings`: listings where seller == connected address (`useListings`), each with available/used/locked quota,
   inline update (price, add quota, active toggle) → `updateListing`.
3. `Earnings`: `balances(address)` read (refetch every 3s), big MON number, Withdraw button → `withdraw()` → TxLink;
   disabled at 0 with a hint.
4. `/sell` page: heading + 3-step explainer (Encrypt key → List quota → Get paid per token used), then the three sections;
   `ReserveWarning`; if not connected show `ConnectButton`.

## Rules
Only those 4 files. Don't run commands (Windows host). Never log/store the plaintext key. Follow the visual direction.

## Done when
Files written. Report imports used from shared modules.
