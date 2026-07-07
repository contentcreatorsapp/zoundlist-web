// ── Zoundlist Suno Importer — Background Service Worker ──────────────────────
// Manages auth state, import queue, and API calls.

const ZOUNDLIST_BASE = "https://zoundlist.com";
const STORAGE_KEY_AUTH  = "zl_auth";
const STORAGE_KEY_QUEUE = "zl_queue";
const STORAGE_KEY_PREFS = "zl_prefs";

// ── Queue item states ─────────────────────────────────────────────────────────
// pending | analyzing | downloading | uploading | created | failed

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getAuth() {
  const { [STORAGE_KEY_AUTH]: auth } = await chrome.storage.local.get(STORAGE_KEY_AUTH);
  if (!auth?.accessToken) return null;
  // Check expiry (give 60s buffer)
  if (auth.expiresAt && Date.now() / 1000 > auth.expiresAt - 60) return null;
  return auth;
}

async function getQueue() {
  const { [STORAGE_KEY_QUEUE]: queue } = await chrome.storage.local.get(STORAGE_KEY_QUEUE);
  return Array.isArray(queue) ? queue : [];
}

async function setQueue(queue) {
  await chrome.storage.local.set({ [STORAGE_KEY_QUEUE]: queue });
}

async function getPrefs() {
  const { [STORAGE_KEY_PREFS]: prefs } = await chrome.storage.local.get(STORAGE_KEY_PREFS);
  return { format: "wav", ...prefs };
}

async function updateQueueItem(uuid, patch) {
  const queue = await getQueue();
  const idx = queue.findIndex(i => i.uuid === uuid);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...patch };
    await setQueue(queue);
    // Broadcast status change to all open Suno tabs
    broadcastToSunoTabs({ type: "TRACK_STATUS", payload: { uuid, ...patch } });
  }
}

// Notify all open Suno tabs (best-effort, ignores errors)
function broadcastToSunoTabs(msg) {
  chrome.tabs.query({ url: ["https://suno.com/*", "https://www.suno.com/*"] })
    .then(tabs => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
      }
    })
    .catch(() => {});
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function apiAnalyze(url, token) {
  const res = await fetch(`${ZOUNDLIST_BASE}/api/extension/suno/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`analyze HTTP ${res.status}`);
  return res.json();
}

async function apiImport(metadata, token, preferWav, wavUrl, albumId) {
  const res = await fetch(`${ZOUNDLIST_BASE}/api/extension/suno/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ metadata, albumId, preferWav, wavUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Process a single queue item ───────────────────────────────────────────────
async function processItem(item) {
  const auth = await getAuth();
  if (!auth) {
    await updateQueueItem(item.uuid, {
      status: "failed",
      error: "Inicia sesión en Zoundlist primero.",
    });
    return;
  }

  const prefs = await getPrefs();
  const preferWav = prefs.format === "wav";

  try {
    // ── Analyze ──────────────────────────────────────────────────────────────
    await updateQueueItem(item.uuid, { status: "analyzing" });
    const analyzeResult = await apiAnalyze(item.url, auth.accessToken);

    if (!analyzeResult.success) {
      await updateQueueItem(item.uuid, {
        status: "failed",
        error: analyzeResult.error ?? "Analyze failed",
      });
      return;
    }

    if (!analyzeResult.audioAccessible && !analyzeResult.wavAvailable) {
      await updateQueueItem(item.uuid, {
        status: "failed",
        error: "El audio no está accesible automáticamente. Descarga y sube manualmente.",
      });
      return;
    }

    const metadata   = analyzeResult.metadata;
    const wavUrl     = (preferWav && analyzeResult.wavAvailable) ? analyzeResult.wavUrl : null;
    const useWav     = preferWav && !!wavUrl;

    // Update with resolved metadata
    await updateQueueItem(item.uuid, {
      status: "downloading",
      title: metadata.title ?? item.title,
      coverUrl: metadata.coverUrl ?? item.coverUrl,
      wavAvailable: analyzeResult.wavAvailable,
    });

    // ── Import ───────────────────────────────────────────────────────────────
    await updateQueueItem(item.uuid, { status: "uploading" });
    const importResult = await apiImport(
      metadata, auth.accessToken, useWav, wavUrl, item.albumId
    );

    await updateQueueItem(item.uuid, {
      status: "created",
      trackId: importResult.trackId,
      format: importResult.format,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateQueueItem(item.uuid, { status: "failed", error: message });
  }
}

// ── Process queue sequentially ────────────────────────────────────────────────
let isProcessing = false;

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const queue = await getQueue();
      const pending = queue.find(i => i.status === "pending");
      if (!pending) break;
      await processItem(pending);
    }
  } finally {
    isProcessing = false;
  }
}

// ── Keep service worker alive during processing ───────────────────────────────
chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive" && isProcessing) {
    // Just wakes up the service worker — no-op
  }
});

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse).catch(err => {
    sendResponse({ error: err.message ?? String(err) });
  });
  return true; // async response
});

async function handleMessage(msg, sender) {
  switch (msg.type) {

    case "SET_AUTH": {
      const { accessToken, refreshToken, expiresAt } = msg.payload;
      await chrome.storage.local.set({
        [STORAGE_KEY_AUTH]: { accessToken, refreshToken, expiresAt },
      });
      return { ok: true };
    }

    case "GET_AUTH_STATUS": {
      const auth = await getAuth();
      return { connected: !!auth };
    }

    case "DISCONNECT": {
      await chrome.storage.local.remove(STORAGE_KEY_AUTH);
      return { ok: true };
    }

    case "CONNECT_ZOUNDLIST": {
      // Open Zoundlist dashboard tab — auth content script will pick up session
      await chrome.tabs.create({ url: "https://zoundlist.com/dashboard", active: true });
      return { ok: true };
    }

    case "QUEUE_TRACK": {
      const { uuid, url, title, coverUrl, duration, albumId } = msg.payload;
      const queue = await getQueue();
      // Avoid duplicate
      if (queue.some(i => i.uuid === uuid)) return { ok: true, duplicate: true };
      queue.push({ uuid, url, title, coverUrl, duration, albumId, status: "pending" });
      await setQueue(queue);
      processQueue(); // fire-and-forget
      return { ok: true };
    }

    case "QUEUE_TRACKS": {
      const { tracks, albumId } = msg.payload;
      const queue = await getQueue();
      let added = 0;
      for (const t of tracks) {
        if (!queue.some(i => i.uuid === t.uuid)) {
          queue.push({ ...t, albumId, status: "pending" });
          added++;
        }
      }
      await setQueue(queue);
      processQueue();
      return { ok: true, added };
    }

    case "RETRY_TRACK": {
      const { uuid } = msg.payload;
      await updateQueueItem(uuid, { status: "pending", error: undefined, trackId: undefined });
      processQueue();
      return { ok: true };
    }

    case "REMOVE_TRACK": {
      const { uuid } = msg.payload;
      const q = await getQueue();
      await setQueue(q.filter(i => i.uuid !== uuid));
      return { ok: true };
    }

    case "CLEAR_QUEUE": {
      // Only clear completed/failed items
      const q = await getQueue();
      await setQueue(q.filter(i => i.status === "pending" || i.status === "analyzing" ||
        i.status === "downloading" || i.status === "uploading"));
      return { ok: true };
    }

    case "GET_QUEUE":
      return { queue: await getQueue() };

    case "SET_FORMAT": {
      const current = await getPrefs();
      await chrome.storage.local.set({ [STORAGE_KEY_PREFS]: { ...current, format: msg.payload.format } });
      return { ok: true };
    }

    case "GET_PREFS":
      return { prefs: await getPrefs() };

    default:
      return { error: "Unknown message type" };
  }
}
