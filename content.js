function decodeHtmlEntities(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function parsePlayerResponseFromScripts() {
  const scripts = Array.from(document.scripts);

  for (const script of scripts) {
    const text = script.textContent || '';
    const marker = 'ytInitialPlayerResponse = ';
    const start = text.indexOf(marker);
    if (start === -1) continue;

    const from = start + marker.length;
    const end = text.indexOf('};', from);
    if (end === -1) continue;

    const jsonText = text.slice(from, end + 1);
    try {
      return JSON.parse(jsonText);
    } catch (_) {
      // continue
    }
  }

  return null;
}

async function fetchTranscriptXml(baseUrl) {
  const response = await fetch(baseUrl + '&fmt=srv3', { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Transcript fetch failed with ${response.status}`);
  }
  return response.text();
}

function extractTranscriptText(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const nodes = Array.from(xml.getElementsByTagName('text'));

  return nodes
    .map((node) => decodeHtmlEntities(node.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

async function getTranscriptFromPlayerResponse() {
  const playerResponse = window.ytInitialPlayerResponse || parsePlayerResponseFromScripts();
  const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim() || document.title.replace(/ - YouTube$/, '');

  if (!playerResponse) {
    throw new Error('Could not read YouTube player data on this page.');
  }

  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!captionTracks.length) {
    throw new Error('No captions/transcript found for this video.');
  }

  const preferredTrack = captionTracks.find((track) => track.languageCode?.startsWith('en')) || captionTracks[0];
  const xml = await fetchTranscriptXml(preferredTrack.baseUrl);
  const transcript = extractTranscriptText(xml);

  if (!transcript) {
    throw new Error('Transcript was empty after parsing captions.');
  }

  return {
    title,
    videoUrl: location.href,
    transcript,
    languageCode: preferredTrack.languageCode || 'unknown'
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_VIDEO_CONTEXT') return;

  getTranscriptFromPlayerResponse()
    .then((payload) => sendResponse({ ok: true, payload }))
    .catch((error) => sendResponse({ ok: false, error: error.message || 'Unknown error' }));

  return true;
});
