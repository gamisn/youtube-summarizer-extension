# YouTube Summarizer Extension

## Phase 1 — MVP ✅
- [x] Create Manifest V3 Chrome extension
- [x] Add popup UI for summary generation
- [x] Add options page for API configuration
- [x] Extract YouTube transcript from caption tracks when available
- [x] Summarize transcript through configurable OpenAI-compatible API
- [ ] Load unpacked in Chrome and test on a real video

## Notes
- Uses the current YouTube tab.
- Works best on videos with available captions/transcripts.
- Default provider config targets OpenAI-compatible chat completions APIs, but endpoint/model are user-configurable.
