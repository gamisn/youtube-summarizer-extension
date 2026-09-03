const defaults = {
  apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4.1-mini',
  systemPrompt: 'You are a precise assistant that summarizes YouTube transcripts. Produce concise, faithful summaries and clearly separate facts from speculation.'
};

const apiBaseUrlEl = document.getElementById('apiBaseUrl');
const apiKeyEl = document.getElementById('apiKey');
const modelEl = document.getElementById('model');
const systemPromptEl = document.getElementById('systemPrompt');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#fca5a5' : '#9ca3af';
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(defaults);
  apiBaseUrlEl.value = settings.apiBaseUrl || defaults.apiBaseUrl;
  apiKeyEl.value = settings.apiKey || '';
  modelEl.value = settings.model || defaults.model;
  systemPromptEl.value = settings.systemPrompt || defaults.systemPrompt;
}

async function saveSettings() {
  const payload = {
    apiBaseUrl: apiBaseUrlEl.value.trim(),
    apiKey: apiKeyEl.value.trim(),
    model: modelEl.value.trim(),
    systemPrompt: systemPromptEl.value.trim()
  };

  if (!payload.apiBaseUrl || !payload.model || !payload.systemPrompt) {
    setStatus('API endpoint, model, and system prompt are required.', true);
    return;
  }

  await chrome.storage.sync.set(payload);
  setStatus('Settings saved.');
}

saveBtn.addEventListener('click', () => {
  saveSettings().catch((error) => setStatus(error.message || 'Save failed.', true));
});

loadSettings().catch((error) => setStatus(error.message || 'Could not load settings.', true));
