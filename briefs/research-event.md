## Goal
Fact-check the Monad Blitz Mumbai [Devcon Edition] event rules from LIVE sources. Output `docs/research/event.md`.
Nothing from memory; every fact with source URL + quoted snippet.

## Context
Official Notion page: https://monad-foundation.notion.site/Monad-Blitz-Mumbai-Devcon-Edition-40d6367594f2807481b4c85b13b42456
Notion public pages are a JS SPA; plain HTML has no body text. Use Notion's public API instead, e.g.
`POST https://monad-foundation.notion.site/api/v3/loadPageChunk` with body
`{"pageId":"40d63675-94f2-8074-81b4-c85b13b42456","limit":100,"cursor":{"stack":[]},"chunkNumber":0,"verticalColumns":false}`
and `syncRecordValues` / `queryCollection` for child pages and databases. Write a small python3 script in
`/tmp` (not in the repo) to walk every child page and print its text. Visit EVERY child page (rules, judging/rubric,
resources, idea board, demo prep, submission, what to bring, schedule).
Also fetch the submission portal https://blitz.devnads.com/events/monad-blitz-mumbai-devcon-edition (record whatever is
publicly visible, including required submission fields if shown).

## Do
Write `docs/research/event.md` with: schedule (code freeze, submission deadline, demo slot length), team-size rule,
fresh-build rule, full judging rubric with points, submission fields, required social tags, resources list (official
templates, faucet, RPCs listed there), and the full idea board list (titles + one-line each). Mark anything not found as
NOT VERIFIED.

## Rules
Only create `docs/research/event.md` (scripts go in /tmp). Don't touch other files.

## Verify
`test -s docs/research/event.md`.

## Done when
File exists; final message lists: code-freeze time, submission deadline, rubric categories with points, submission fields.
