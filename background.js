import { checkQuota, consumeQuota, getWeeklyUsage, saveLicenseKey, PRODUCT_URL } from './license.js';
import { getEntitlements } from './entitlements.js';
import { summarizeLongVideo } from './longform.js';

const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4.1-mini',
  systemPrompt: 'You are a precise assistant that summarizes YouTube transcripts. Produce concise, faithful summaries and clearly separate facts from speculation.'
};

const SUMMARY_INSTRUCTIONS = {
  bullets: 'Return a concise bulleted summary with the most important points first.',
  key_takeaways: 'Return 5-8 key takeaways with short explanations.',
  detailed: 'Return a more detailed structured summary with sections.'
};

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

function buildUserPrompt({ title, videoUrl, transcript, summaryType, customPrompt, instruction }) {
  const text = instruction || SUMMARY_INSTRUCTIONS[summaryType] || SUMMARY_INSTRUCTIONS.bullets;
  const extra = customPrompt?.trim() ? `\nAdditional user instruction: ${customPrompt.trim()}\n` : '';
  return [
    `Video title: ${title}`,
    `Video URL: ${videoUrl}`,
    `Task: ${text}`,
    extra,
    'Transcript:',
    transcript
  ].join('\n\n');
}

async function callLlm({ system, user }, settings) {
  const response = await fetch(settings.apiBaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `LLM request failed with ${response.status}`;
    throw new Error(message);
  }
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('The API returned no summary text.');
  return content;
}

async function saveHistory(entry, historyLimit) {
  if (!historyLimit) return;
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({ ...entry, at: Date.now() });
  await chrome.storage.local.set({ history: history.slice(0, historyLimit) });
}

async function handleSummarize(request) {
  const settings = await getSettings();
  if (!settings.apiKey?.trim()) {
    throw new Error('Missing API key. Open the extension settings and save your API key.');
  }

  const ent = await getEntitlements();

  // Quota gate (premium = unlimited). Quota is consumed only after a
  // successful summary — see consumeQuota below.
  const quota = await checkQuota();
  if (!quota.allowed) {
    const err = new Error(`Free plan limit reached (${quota.count}/${quota.limit} this week). Upgrade to Premium for unlimited summaries.`);
    err.code = 'UPGRADE';
    throw err;
  }

  // Transcript length gate: hard cap first, then chunking eligibility.
  const len = request.transcript.length;
  if (len > ent.maxTranscriptChars) {
    if (!ent.longVideoChunking) {
      const err = new Error(`This transcript is ${Math.round(len / 1000)}K chars — the free tier handles up to ${Math.round(ent.maxTranscriptChars / 1000)}K. Premium summarizes videos of any length.`);
      err.code = 'UPGRADE';
      throw err;
    }
    throw new Error(`This transcript is ${Math.round(len / 1000)}K chars — above the ${Math.round(ent.maxTranscriptChars / 1000)}K limit.`);
  }

  let result;
  if (len > ent.singleShotChars && ent.longVideoChunking) {
    const longform = await summarizeLongVideo(
      { ...request, systemPrompt: settings.systemPrompt, summaryInstruction: SUMMARY_INSTRUCTIONS[request.summaryType] },
      (call) => callLlm(call, settings)
    );
    if (longform) {
      result = { summary: longform.summary, mode: 'longform', parts: longform.parts };
    }
  }

  if (!result) {
    const summary = await callLlm(
      { system: settings.systemPrompt, user: buildUserPrompt(request) },
      settings
    );
    result = { summary, mode: 'single' };
  }

  await consumeQuota();
  const entry = { title: request.title, videoUrl: request.videoUrl, summary: result.summary };
  if (result.parts) entry.parts = result.parts;
  await saveHistory(entry, ent.history);
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SUMMARIZE_VIDEO') {
    handleSummarize(message.payload)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message, code: error.code || null }));
    return true;
  }

  if (message?.type === 'GET_STATE') {
    (async () => {
      const [ent, usage, { history = [] }, settings] = await Promise.all([
        getEntitlements(),
        getWeeklyUsage(),
        chrome.storage.local.get('history'),
        getSettings()
      ]);
      sendResponse({
        ok: true,
        tier: ent.tier,
        reason: ent.reason,
        usage,
        history,
        apiKeyConfigured: !!settings.apiKey?.trim()
      });
    })().catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (message?.type === 'GET_PRODUCT_URL') {
    (async () => {
      sendResponse({ ok: true, url: PRODUCT_URL });
    })().catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (message?.type === 'ACTIVATE_LICENSE') {
    (async () => {
      const state = await saveLicenseKey(message.key);
      sendResponse({ ok: true, premium: state.premium, reason: state.reason });
    })().catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
