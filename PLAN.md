# YouTube Summarizer Extension

## Phase 1 — MVP ✅
- [x] Create Manifest V3 Chrome extension
- [x] Add popup UI for summary generation
- [x] Add options page for API configuration
- [x] Extract YouTube transcript from caption tracks when available
- [x] Summarize transcript through configurable OpenAI-compatible API
- [ ] Load unpacked in Chrome and test on a real video

## Phase 2 — Freemium ✅ (code complete, 2026-09-03)
- [x] License module (license.js): Lemon Squeezy validate + 7-day offline grace cache
- [x] Weekly free quota: 10 summaries/week (Monday-anchored), premium unlimited
- [x] Entitlement gates (entitlements.js): transcript length, long-video, export, history
- [x] Premium long-video map-reduce summarization (longform.js) — verified with unit tests (5/5)
- [x] Popup: tier badge, quota meter, license activation, upgrade link, copy/export .md
- [x] Options page: license activate/remove panel
- [x] Summary history (premium, 50 entries) via GET_STATE
- [ ] Paste real PRODUCT_URL in license.js after Lemon Squeezy store setup

## Phase 3 — Launch ⬜
- [ ] Lemon Squeezy: create store + product ($4/mo sub + $29 lifetime one-off), enable EU VAT MoR, Serbia payout via Payoneer/Wise
- [ ] Replace PRODUCT_URL placeholder
- [ ] Chrome Web Store: $5 dev registration, assets (128/440 icons, 1280x800 screenshot), listing copy, privacy policy URL (static page on Hetzner VPS)
- [ ] Load unpacked → manual E2E on a real video (free path + license path + long video)
- [ ] Submit for review

## Notes
- BYOK model: users pay their own LLM API cost → marginal cost per user ≈ €0; free tier can stay generous.
- Free: 3 styles, 10/wk, ≤30K-char transcripts. Premium $4/mo: unlimited, any length (map-reduce), 400K cap, .md export, 50-item history.
- License validation is graceful: network down → previous status held for 7 days, never locks out paying users mid-flight.