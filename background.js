const DEFAULT_SETTINGS = {
  apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4.1-mini',
  systemPrompt: 'You are a precise assistant that summarizes YouTube transcripts. Produce concise, faithful summaries and clearly separate facts from speculation.'
};

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

function buildUserPrompt({ title, videoUrl, transcript, summaryType, customPrompt }) {
  const summaryInstructionMap = {
    bullets: 'Return a concise bulleted summary with the most important points first.',
    key_takeaways: 'Return 5-8 key takeaways with short explanations.',
    detailed: 'Return a more detailed structured summary with sections.'
  };

  const instruction = summaryInstructionMap[summaryType] || summaryInstructionMap.bullets;
  const extra = customPrompt?.trim() ? `\nAdditional user instruction: ${customPrompt.trim()}\n` : '';

  return [
    `Video title: ${title}`,
    `Video URL: ${videoUrl}`,
    `Task: ${instruction}`,
    extra,
    'Transcript:',
    transcript
  ].join('\n\n');
}

async function summarizeVideo(request) {
  const settings = await getSettings();

  if (!settings.apiKey?.trim()) {
    throw new Error('Missing API key. Open the extension settings and save your API key.');
  }

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
        { role: 'system', content: settings.systemPrompt },
        {
          role: 'user',
          content: buildUserPrompt(request)
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `LLM request failed with ${response.status}`;
    throw new Error(message);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('The API returned no summary text.');
  }

  return content;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'SUMMARIZE_VIDEO') return;

  summarizeVideo(message.payload)
    .then((summary) => sendResponse({ ok: true, summary }))
    .catch((error) => sendResponse({ ok: false, error: error.message || 'Unknown error' }));

  return true;
});
