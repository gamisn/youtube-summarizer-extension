# YouTube Video Summarizer Chrome Extension

A Manifest V3 Chrome extension that summarizes the current YouTube video using its caption transcript and a configurable OpenAI-compatible API.

## Features
- Works on the current `youtube.com/watch` tab
- Extracts transcript from YouTube caption tracks when available
- Supports summary modes: bullets, key takeaways, detailed
- Lets you set your own API endpoint, API key, model, and system prompt

## Files
- `manifest.json` — extension manifest
- `popup.html` / `popup.js` — popup UI
- `options.html` / `options.js` — settings page
- `content.js` — transcript extraction from YouTube
- `background.js` — LLM API call
- `styles.css` — shared styling
- `PLAN.md` — simple phase tracker

## Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder:
   `/home/gamzatore/Workspace/youtube-summarizer-extension`

## Configure
1. Open the extension's **Details** → **Extension options**
2. Set:
   - API endpoint, e.g. `https://api.openai.com/v1/chat/completions`
   - API key
   - Model, e.g. `gpt-4.1-mini`
3. Save settings

## Use
1. Open a YouTube video that has captions
2. Click the extension icon
3. Choose summary style
4. Click **Summarize current video**

## Notes
- If a video has no captions, the extension cannot produce a transcript.
- The endpoint is configurable, so you can point it at OpenAI or another OpenAI-compatible provider.
- This MVP does not yet include timestamped summaries, transcript preview, or local/offline summarization.
