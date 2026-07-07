// ── Zoundlist Suno Importer — Popup ──────────────────────────────────────────

const STATUS_LABELS = {
  pending:     { label: "Pending",     cls: "" },
  analyzing:   { label: "Analyzing",   cls: "" },
  downloading: { label: "Downloading", cls: "" },
  uploading:   { label: "Uploading",   cls: "" },
  created:     { label: "Imported",    cls: "done" },
  failed:      { label: "Failed",      cls: "failed" },
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const elBadge      = document.getElementById("auth-badge");
const elSectionAuth   = document.getElementById("section-auth");
const elSectionConn   = document.getElementById("section-connected");
const elQueueList  = document.getElementById("queue-list");
const elQueueEmpty = document.getElementById("queue-empty");
const elStatQueued = document.getElementById("stat-queued");
const elStatDone   = document.getElementById("stat-done");
const elStatFailed = document.getElementById("stat-failed");
const elFmtWav     = document.getElementById("fmt-wav");
const elFmtMp3     = document.getElementById("fmt-mp3");
const elWavHint    = document.getElementById("wav-hint");
const elBtnConnect = document.getElementById("btn-connect");
const elBtnClear   = document.getElementById("btn-clear");
const elBtnDisconn = document.getElementById("btn-disconnect");

// ── State ─────────────────────────────────────────────────────────────────────
let isConnected = false;

// ── Auth status ───────────────────────────────────────────────────────────────
function setAuthUI(connected) {
  isConnected = connected;
  elBadge.textContent = connected ? "Connected" : "Not connected";
  elBadge.className   = `badge ${connected ? "connected" : "disconnected"}`;
  elSectionAuth.classList.toggle("hidden", connected);
  elSectionConn.classList.toggle("hidden", !connected);
}

async function checkAuth() {
  try {
    const res = await sendMessage({ type: "GET_AUTH_STATUS" });
    setAuthUI(res?.connected ?? false);
  } catch {
    setAuthUI(false);
  }
}

// ── Queue rendering ───────────────────────────────────────────────────────────
function renderQueue(queue) {
  if (!Array.isArray(queue)) queue = [];

  const pending  = queue.filter(i => ["pending","analyzing","downloading","uploading"].includes(i.status)).length;
  const done     = queue.filter(i => i.status === "created").length;
  const failed   = queue.filter(i => i.status === "failed").length;

  elStatQueued.textContent = pending + done + failed;
  elStatDone.textContent   = done;
  elStatFailed.textContent = failed;

  elQueueList.innerHTML = "";

  if (queue.length === 0) {
    elQueueEmpty.classList.remove("hidden");
    return;
  }
  elQueueEmpty.classList.add("hidden");

  // Show most recent first
  const sorted = [...queue].reverse();
  for (const item of sorted) {
    elQueueList.appendChild(buildQueueItem(item));
  }
}

function buildQueueItem(item) {
  const { uuid, title, coverUrl, status, error, trackId, format, wavAvailable } = item;
  const info = STATUS_LABELS[status] ?? { label: status, cls: "" };

  const el = document.createElement("div");
  el.className = "queue-item";

  // Cover
  if (coverUrl) {
    const img = document.createElement("img");
    img.src = coverUrl;
    img.className = "queue-item-cover";
    img.onerror = () => img.remove();
    el.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "queue-item-cover";
    placeholder.style.display = "flex";
    placeholder.style.alignItems = "center";
    placeholder.style.justifyContent = "center";
    placeholder.style.fontSize = "16px";
    placeholder.textContent = "🎵";
    el.appendChild(placeholder);
  }

  // Info
  const infoEl = document.createElement("div");
  infoEl.className = "queue-item-info";

  const titleEl = document.createElement("div");
  titleEl.className = "queue-item-title";
  titleEl.textContent = title ?? "Unknown track";
  infoEl.appendChild(titleEl);

  const subEl = document.createElement("div");
  subEl.className = "queue-item-sub";
  if (status === "failed" && error) {
    subEl.textContent = error;
    subEl.style.color = "rgba(255,122,69,0.7)";
  } else if (status === "created" && format) {
    subEl.textContent = format.toUpperCase() + (wavAvailable ? " · WAV ✓" : "");
  } else {
    subEl.textContent = uuid?.slice(0, 8) + "…";
  }
  infoEl.appendChild(subEl);
  el.appendChild(infoEl);

  // Status
  const statusEl = document.createElement("div");
  statusEl.className = "queue-item-status";

  const dot = document.createElement("div");
  dot.className = `status-dot ${status}`;
  statusEl.appendChild(dot);

  if (status === "failed") {
    const retryBtn = document.createElement("button");
    retryBtn.className   = "btn-retry";
    retryBtn.textContent = "Retry";
    retryBtn.addEventListener("click", () => {
      sendMessage({ type: "RETRY_TRACK", payload: { uuid } });
    });
    statusEl.appendChild(retryBtn);
  } else if (status === "created" && trackId) {
    const openLink = document.createElement("a");
    openLink.className   = "btn-open";
    openLink.textContent = "Open";
    openLink.href        = `https://zoundlist.com/dashboard/tracks/${trackId}`;
    openLink.target      = "_blank";
    openLink.rel         = "noopener noreferrer";
    statusEl.appendChild(openLink);
  } else {
    const lbl = document.createElement("span");
    lbl.className   = `status-lbl ${info.cls}`;
    lbl.textContent = info.label;
    statusEl.appendChild(lbl);
  }

  el.appendChild(statusEl);
  return el;
}

// ── Refresh loop ──────────────────────────────────────────────────────────────
async function refreshQueue() {
  if (!isConnected) return;
  try {
    const res = await sendMessage({ type: "GET_QUEUE" });
    renderQueue(res?.queue ?? []);
  } catch { /* service worker sleeping */ }
}

// ── Format preference ─────────────────────────────────────────────────────────
async function loadPrefs() {
  try {
    const res = await sendMessage({ type: "GET_PREFS" });
    applyFormat(res?.prefs?.format ?? "wav");
  } catch { /* default */ }
}

function applyFormat(fmt) {
  elFmtWav.classList.toggle("active", fmt === "wav");
  elFmtMp3.classList.toggle("active", fmt === "mp3");
  elWavHint.textContent = fmt === "wav" ? "lossless preferred" : "mp3 only";
}

// ── Event listeners ───────────────────────────────────────────────────────────
elBtnConnect.addEventListener("click", () => {
  sendMessage({ type: "CONNECT_ZOUNDLIST" });
  window.close();
});

elBtnClear.addEventListener("click", async () => {
  await sendMessage({ type: "CLEAR_QUEUE" });
  refreshQueue();
});

elBtnDisconn.addEventListener("click", async () => {
  await sendMessage({ type: "DISCONNECT" });
  setAuthUI(false);
});

elFmtWav.addEventListener("click", () => {
  applyFormat("wav");
  sendMessage({ type: "SET_FORMAT", payload: { format: "wav" } });
});
elFmtMp3.addEventListener("click", () => {
  applyFormat("mp3");
  sendMessage({ type: "SET_FORMAT", payload: { format: "mp3" } });
});

// ── Storage change listener ───────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.zl_queue) {
    renderQueue(changes.zl_queue.newValue ?? []);
  }
  if (changes.zl_auth) {
    checkAuth();
  }
});

// ── Utility ───────────────────────────────────────────────────────────────────
function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(res);
      }
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  elBadge.textContent = "•••";
  elBadge.className   = "badge loading";
  await checkAuth();
  await loadPrefs();
  await refreshQueue();

  // Refresh queue every 2 seconds while popup is open
  setInterval(refreshQueue, 2000);
})();
