// Lemon Squeezy license validation + entitlement helpers.
// Replace PRODUCT_URL and STORE info after creating the Lemon Squeezy store.
const LS_LICENSE_API = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const LS_ACTIVATE_API = 'https://api.lemonsqueezy.com/v1/licenses/activate';

// TODO(owner): paste the Lemon Squeezy purchase link for the extension product.
export const PRODUCT_URL = 'https://REPLACE-ME.lemonsqueezy.com/checkout';

// TODO(owner): fill in after creating the Lemon Squeezy product, so keys from
// other products/stores can't unlock premium. Empty array = check skipped.
const EXPECTED_PRODUCT_IDS = [];

const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // offline grace for last successful validation

export async function getLicenseState() {
  const { license = null, licenseCache = null } = await chrome.storage.local.get(['license', 'licenseCache']);
  if (!license || !license.key) return { premium: false, reason: 'no-license' };

  const cached = licenseCache && licenseCache.key === license.key ? licenseCache : null;
  const cacheFresh = cached && (Date.now() - cached.checkedAt) < GRACE_MS;

  if (cacheFresh) {
    return { premium: !!cached.valid, reason: cached.valid ? 'cached-valid' : 'cached-invalid' };
  }

  // Cache stale -> revalidate (graceful: on network error keep previous status)
  try {
    const res = await fetch(LS_LICENSE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ license_key: license.key })
    });
    const data = await res.json();
    // LS validate response: top-level "valid", license status inside license_key
    // (there is no top-level "status" field).
    const valid = !!(
      data &&
      data.valid === true &&
      data.license_key?.status === 'active' &&
      (EXPECTED_PRODUCT_IDS.length === 0 || EXPECTED_PRODUCT_IDS.includes(data.meta?.product_id))
    );
    const entry = { key: license.key, valid, checkedAt: Date.now(), expires_at: data?.license_key?.expires_at || null };
    await chrome.storage.local.set({ licenseCache: entry });
    return { premium: valid, reason: valid ? 'validated' : 'invalid' };
  } catch (e) {
    if (cached) return { premium: !!cached.valid, reason: 'grace-period' };
    return { premium: false, reason: 'validation-unreachable' };
  }
}

export async function saveLicenseKey(key) {
  const clean = (key || '').trim();
  if (!clean) {
    await chrome.storage.local.remove(['license', 'licenseCache']);
    return { premium: false, cleared: true };
  }
  await chrome.storage.local.set({ license: { key: clean, savedAt: Date.now() } });
  const state = await getLicenseState();
  return state;
}

export function currentWeekStart(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Monday=1..Sunday=7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

const FREE_LIMIT = 10;

// Usage for the current week, resetting stale weeks without writing.
// Used by both the quota gate and GET_STATE so the popup never shows a
// stale count from a previous week.
export async function getWeeklyUsage() {
  const { usage = null } = await chrome.storage.local.get('usage');
  const week = currentWeekStart();
  return usage && usage.weekStart === week ? usage : { weekStart: week, count: 0 };
}

// Read-only gate check. Consuming happens separately (consumeQuota) so a
// failed or rejected summary never burns quota.
export async function checkQuota() {
  const [u, state] = [await getWeeklyUsage(), await getLicenseState()];
  if (state.premium) return { allowed: true, premium: true, count: u.count, limit: null };
  if (u.count >= FREE_LIMIT) return { allowed: false, premium: false, count: u.count, limit: FREE_LIMIT, upgrade: true };
  return { allowed: true, premium: false, count: u.count, limit: FREE_LIMIT };
}

// Call only after a summary has actually succeeded.
export async function consumeQuota() {
  const u = await getWeeklyUsage();
  u.count += 1;
  await chrome.storage.local.set({ usage: u });
  return u;
}
