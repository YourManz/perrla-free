/**
 * PERRLA Free — Reference Capture
 * Service worker: manages saved references in chrome.storage.local.
 */

'use strict';

// ─── Install ──────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.local.set({
      savedRefs: [],
      citationStyle: 'apa7',
    });
    console.log('[PERRLA Free] Extension installed. Storage initialised.');
  }
});

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'saveReference':
      handleSaveReference(message.ref).then(sendResponse);
      return true; // async response

    case 'getRefs':
      handleGetRefs().then(sendResponse);
      return true;

    case 'clearRefs':
      handleClearRefs().then(sendResponse);
      return true;

    case 'removeRef':
      handleRemoveRef(message.url).then(sendResponse);
      return true;

    default:
      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
  }
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Save a reference, deduplicating by URL.
 * @param {Object} ref
 * @returns {Promise<{ok: boolean, count: number}>}
 */
async function handleSaveReference(ref) {
  const { savedRefs = [] } = await chrome.storage.local.get('savedRefs');

  // Dedup by URL
  const existing = savedRefs.findIndex((r) => r.url === ref.url);
  if (existing !== -1) {
    savedRefs[existing] = { ...savedRefs[existing], ...ref, savedAt: Date.now() };
  } else {
    savedRefs.push({ ...ref, savedAt: Date.now() });
  }

  await chrome.storage.local.set({ savedRefs });
  return { ok: true, count: savedRefs.length };
}

/**
 * Return all saved references.
 * @returns {Promise<{ok: boolean, refs: Object[]}>}
 */
async function handleGetRefs() {
  const { savedRefs = [] } = await chrome.storage.local.get('savedRefs');
  return { ok: true, refs: savedRefs };
}

/**
 * Clear all saved references.
 * @returns {Promise<{ok: boolean}>}
 */
async function handleClearRefs() {
  await chrome.storage.local.set({ savedRefs: [] });
  return { ok: true };
}

/**
 * Remove a single reference by URL.
 * @param {string} url
 * @returns {Promise<{ok: boolean, count: number}>}
 */
async function handleRemoveRef(url) {
  const { savedRefs = [] } = await chrome.storage.local.get('savedRefs');
  const filtered = savedRefs.filter((r) => r.url !== url);
  await chrome.storage.local.set({ savedRefs: filtered });
  return { ok: true, count: filtered.length };
}
