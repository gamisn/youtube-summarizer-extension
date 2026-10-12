// Premium feature gates. Single source of truth for free vs premium entitlements.
import { getLicenseState } from './license.js';

export const ENTITLEMENTS = {
  FREE: {
    summaryTypes: ['bullets', 'key_takeaways', 'detailed'],
    singleShotChars: 30000,
    maxTranscriptChars: 30000,
    longVideoChunking: false,
    timestamps: false,
    history: 0,
    markdownExport: false
  },
  PREMIUM: {
    summaryTypes: ['bullets', 'key_takeaways', 'detailed'],
    singleShotChars: 30000,
    maxTranscriptChars: 400000,
    longVideoChunking: true,
    timestamps: true,
    history: 50,
    markdownExport: true
  }
};

export async function getEntitlements() {
  const state = await getLicenseState();
  return { tier: state.premium ? 'PREMIUM' : 'FREE', ...ENTITLEMENTS[state.premium ? 'PREMIUM' : 'FREE'], reason: state.reason };
}

export function requiresPremium(feature, ent) {
  switch (feature) {
    case 'longVideo': return !ent.longVideoChunking;
    case 'timestamps': return !ent.timestamps;
    case 'history': return ent.history === 0;
    case 'export': return !ent.markdownExport;
    default: return false;
  }
}
