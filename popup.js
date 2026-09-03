const summarizeBtn = document.getElementById('summarizeBtn');
const openOptionsBtn = document.getElementById('openOptionsBtn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const summaryTypeEl = document.getElementById('summaryType');
const customPromptEl = document.getElementById('customPrompt');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#fca5a5' : '#9ca3af';
}

function setResult(text) {
  resultEl.textContent = text;
  resultEl.classList.remove('hidden');
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => chrome.tabs.sendMessage(tabId, message, resolve));
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function summarizeCurrentVideo() {
  resultEl.classList.add('hidden');
  setStatus('Inspecting current tab...');

  const tab = await getActiveTab();
  if (!tab?.id || !tab.url?.includes('youtube.com/watch')) {
    setStatus('Open a YouTube video page first.', true);
    return;
  }

  setStatus('Extracting transcript...');
  const contextResponse = await sendMessageToTab(tab.id, { type: 'GET_VIDEO_CONTEXT' });

  if (!contextResponse?.ok) {
    setStatus(contextResponse?.error || 'Could not read transcript from the page.', true);
    return;
  }

  setStatus('Generating summary...');
  const summarizeResponse = await sendRuntimeMessage({
    type: 'SUMMARIZE_VIDEO',
    payload: {
      ...contextResponse.payload,
      summaryType: summaryTypeEl.value,
      customPrompt: customPromptEl.value
    }
  });

  if (!summarizeResponse?.ok) {
    setStatus(summarizeResponse?.error || 'Summarization failed.', true);
    return;
  }

  setStatus(`Done. Transcript language: ${contextResponse.payload.languageCode}`);
  setResult(summarizeResponse.summary);
}

summarizeBtn.addEventListener('click', () => {
  summarizeCurrentVideo().catch((error) => {
    setStatus(error.message || 'Unexpected error.', true);
  });
});

openOptionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
