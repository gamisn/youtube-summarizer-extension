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
- [x] Pre-launch review fixes (2026-09-04): LS validation reads `license_key.status`, quota consumed only after success, GET_STATE resets stale week, 400K premium cap enforced, no-key first-run UX, `<all_urls>` replaced with optional host permission for custom endpoints
- [ ] Paste real PRODUCT_URL + EXPECTED_PRODUCT_IDS in license.js after Lemon Squeezy store setup

## Phase 3 — Launch ⬜
- [ ] Lemon Squeezy: create store + product ($4/mo subscription only — lifetime dropped 2026-09-04 so future hosted-inference costs can't become prepaid annuity), enable EU VAT MoR, Serbia payout via Payoneer/Wise
- [ ] Replace PRODUCT_URL placeholder
- [ ] Chrome Web Store: $5 dev registration, assets (128/440 icons, 1280x800 screenshot), listing copy, privacy policy URL (static page on Hetzner VPS)
- [ ] Load unpacked → manual E2E on a real video (free path + license path + long video)
- [ ] Submit for review

## Phase 4 — Managed AI relay ("no API key" premium) ⬜ APPROVED NEXT
Premium switches from BYOK-only to **built-in AI**: user pays $4, installs, it just works. Free/BYOK path unchanged.

Architecture (credential-proxy pattern — extension never holds any API key):
```
Extension (Premium) ──┐
                      ├──> Relay on Hetzner VPS (FastAPI)
MCP clients ──────────┘     ├─ auth: Lemon Squeezy license key + tier lookup
(Claude/Codex/              ├─ quota engine + SQLite usage ledger + kill switch
 OpenCode/Hermes)           └─ upstream adapters: groq (primary, metered key)
                                        openrouter (fallback)
                                        personal-subscription adapter = OWNER-ONLY
```
Checklist:
- [ ] Relay service (~200 lines FastAPI): POST /v1/summarize (extension), MCP tool summarize_video(url, style), GET /usage (per-key)
- [ ] Quota engine: Premium $4 = 600/mo (20/day) · Premium+ $9 = 3,000/mo (100/day) · 4 req/min rate limit
- [ ] Hard token caps per request: input ≤100K tok, output ≤1000 tok (worst-case burn: Premium ~$0.53/mo, Premium+ ~$2.64/mo)
- [ ] Usage ledger: per key/day — requests, tokens in/out (from provider usage field), est $ at configured rate; anomaly flag: >3 distinct IPs/day/key (key-sharing)
- [ ] Owner views: weekly cron digest → Telegram (top spenders, totals, anomalies, quota-hitters); global monthly budget cap with 50/80/100% alerts; kill-switch flag
- [ ] User transparency: GET /usage → "340/600 this month" (reduces refunds)
- [ ] Overage: soft-stop + upgrade prompt, never surprise-billed
- [ ] ToS rule (structural, not disciplinary): paying traffic ONLY via metered API adapters; personal/company subscription seats (OAuth) are owner-only, never proxied to third parties
- [ ] Extension: "Use built-in AI (Premium)" toggle → relay endpoint; Ollama one-click preset for BYOK path (privacy positioning)
- [ ] systemd unit + public HTTPS (needs domain — also unlocks CWS privacy policy page)
- [ ] Tests: quota engine unit tests + relay E2E with stub upstream
- [ ] Update license.js/entitlements.js: premium = managed quota (600/mo) instead of unlimited; Premium+ tier in LS store

## Notes
- BYOK model: users pay their own LLM API cost → marginal cost per user ≈ €0; free tier can stay generous.
- Free: 3 styles, 10/wk, ≤30K-char transcripts. Premium $4/mo: unlimited, any length (map-reduce), 400K cap, .md export, 50-item history.
- License validation is graceful: network down → previous status held for 7 days, never locks out paying users mid-flight.
