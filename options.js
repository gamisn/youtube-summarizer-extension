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
const licenseKeyEl = document.getElementById('licenseKey');
const activateBtn = document.getElementById('activateBtn');
const clearLicenseBtn = document.getElementById('clearLicenseBtn');
const licenseStatusEl = document.getElementById('licenseStatus');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#fca5a5' : '#9ca3af';
}

function setLicenseStatus(message, isError = false) {
  licenseStatusEl.textContent = message;
  licenseStatusEl.style.color = isError ? '#fca5a5' : '#9ca3af';
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(defaults);
  apiBaseUrlEl.value = settings.apiBaseUrl || defaults.apiBaseUrl;
  apiKeyEl.value = settings.apiKey || '';
  modelEl.value = settings.model || defaults.model;
  systemPromptEl.value = settings.systemPrompt || defaults.systemPrompt;

  const { license = null } = await chrome.storage.local.get('license');
  if (license?.key) licenseKeyEl.value = license.key;
  const res = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  if (res?.ok) {
    setLicenseStatus(res.tier === 'PREMIUM' ? 'Status: Premium active.' : 'Status: Free plan.');
  }
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

async function activateLicense() {
  const key = licenseKeyEl.value.trim();
  if (!key) {
    setLicenseStatus('Paste a license key first.', true);
    return;
  }
  setLicenseStatus('Validating...');
  const res = await chrome.runtime.sendMessage({ type: 'ACTIVATE_LICENSE', key });
  if (res?.ok && res.premium) {
    setLicenseStatus('Premium activated. Thank you!');
  } else if (res?.ok) {
    setLicenseStatus('Key saved, but not valid/active. Check it in Lemon Squeezy.', true);
  } else {
    setLicenseStatus(res?.error || 'Validation failed.', true);
  }
}

async function clearLicense() {
  await chrome.runtime.sendMessage({ type: 'ACTIVATE_LICENSE', key: '' });
  licenseKeyEl.value = '';
  setLicenseStatus('License removed. Back on the free plan.');
}

saveBtn.addEventListener('click', () => {
  saveSettings().catch((error) => setStatus(error.message || 'Save failed.', true));
});
activateBtn.addEventListener('click', () => activateLicense().catch((e) => setLicenseStatus(e.message, true)));
clearLicenseBtn.addEventListener('click', () => clearLicense().catch((e) => setLicenseStatus(e.message, true)));

loadSettings().catch((error) => setStatus(error.message || 'Could not load settings.', true));