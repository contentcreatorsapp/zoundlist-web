// ── Zoundlist Suno Importer — Suno Content Script ────────────────────────────
// Detects song cards on suno.com, injects import buttons, manages bulk selection.

(function () {
  "use strict";

  const ZL_ATTR   = "data-zl-injected";
  const ZL_UUID   = "data-zl-uuid";
  const ZL_STATUS = "data-zl-status";

  let selectedUUIDs  = new Set();
  let preferredFormat = "wav";
  let selectModeActive = false;

  // ── UUID extraction ─────────────────────────────────────────────────────────
  function extractUUID(url) {
    const m = url.match(/\/song\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    return m?.[1] ?? null;
  }

  function buildSongUrl(uuid) {
    return `https://suno.com/song/${uuid}`;
  }

  // ── WAV availability check (browser-side, with user's session cookies) ──────
  async function checkWavAvailable(uuid) {
    try {
      const url = `https://cdn1.suno.ai/${uuid}.wav`;
      const res = await fetch(url, { method: "HEAD" });
      return res.ok && (res.headers.get("content-type") ?? "").includes("audio");
    } catch {
      return false;
    }
  }

  // ── Find song card container from a song link ─────────────────────────────
  function findCardContainer(link) {
    // Walk up at most 8 levels to find the song card
    let el = link.parentElement;
    for (let i = 0; i < 8; i++) {
      if (!el) return null;
      // Heuristic: card has img descendant, reasonable size, not the whole page
      const hasImg = el.querySelector("img") !== null;
      const rect   = el.getBoundingClientRect();
      const isList = el.tagName === "LI";
      const isCard = hasImg && rect.height > 40 && rect.height < 600 && rect.width > 80;
      if (isList || isCard) return el;
      el = el.parentElement;
    }
    return null;
  }

  // ── Inject button/checkbox into a single song card ─────────────────────────
  function injectCard(container, uuid) {
    if (container.hasAttribute(ZL_ATTR)) return;
    container.setAttribute(ZL_ATTR, "1");
    container.setAttribute(ZL_UUID, uuid);
    container.style.position = "relative";

    // ── Import button ──────────────────────────────────────────────────────
    const btn = document.createElement("button");
    btn.className  = "zl-import-btn";
    btn.setAttribute(ZL_STATUS, "idle");
    btn.textContent = "⬇ Zoundlist";
    btn.title = "Import to Zoundlist";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      await queueTrack(container, uuid, btn);
    });

    // ── Selection checkbox ────────────────────────────────────────────────
    const cb = document.createElement("input");
    cb.type      = "checkbox";
    cb.className = "zl-select-checkbox";
    cb.title     = "Select for bulk import";
    cb.addEventListener("change", () => {
      if (cb.checked) {
        selectedUUIDs.add(uuid);
        container.classList.add("zl-card-selected");
        activateSelectMode();
      } else {
        selectedUUIDs.delete(uuid);
        container.classList.remove("zl-card-selected");
        if (selectedUUIDs.size === 0) deactivateSelectMode();
      }
      updateBulkBar();
    });

    // Find a good injection point: preferably near existing action buttons
    const actionArea = findActionArea(container) ?? container;
    actionArea.appendChild(btn);
    container.appendChild(cb);
  }

  function findActionArea(card) {
    // Look for button containers (Suno typically has a row of icon buttons)
    const selectors = [
      '[class*="action"]',
      '[class*="button"]',
      '[class*="control"]',
      '[class*="footer"]',
      '[class*="bottom"]',
    ];
    for (const sel of selectors) {
      const found = card.querySelector(sel);
      if (found) return found;
    }
    return null;
  }

  // ── Queue a track for import ───────────────────────────────────────────────
  async function queueTrack(container, uuid, btn) {
    setButtonState(btn, "loading", "Importing…");
    const url      = buildSongUrl(uuid);
    const title    = getCardTitle(container);
    const coverUrl = getCardCover(container);
    const duration = getCardDuration(container);

    chrome.runtime.sendMessage({
      type: "QUEUE_TRACK",
      payload: { uuid, url, title, coverUrl, duration, albumId: null },
    }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        setButtonState(btn, "error", "Failed");
        return;
      }
      if (res.duplicate) {
        setButtonState(btn, "done", "Queued ✓");
      }
    });
  }

  function setButtonState(btn, state, label) {
    btn.className = "zl-import-btn";
    btn.setAttribute(ZL_STATUS, state);
    btn.textContent = label;
    switch (state) {
      case "loading": btn.classList.add("zl-import-btn--loading"); btn.disabled = true;  break;
      case "done":    btn.classList.add("zl-import-btn--done");    btn.disabled = true;  break;
      case "error":   btn.classList.add("zl-import-btn--error");   btn.disabled = false; break;
      default: btn.disabled = false;
    }
  }

  // ── Extract visible metadata from card DOM ────────────────────────────────
  function getCardTitle(card) {
    const candidates = [
      card.querySelector("h2, h3, h4"),
      card.querySelector('[class*="title"]'),
      card.querySelector('[class*="name"]'),
      card.querySelector("p"),
    ];
    for (const el of candidates) {
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return null;
  }

  function getCardCover(card) {
    const img = card.querySelector("img");
    return img?.src ?? img?.getAttribute("data-src") ?? null;
  }

  function getCardDuration(card) {
    const durationEl = card.querySelector('[class*="duration"], [class*="time"], time');
    return durationEl?.textContent?.trim() ?? null;
  }

  // ── Song detail page injection ─────────────────────────────────────────────
  function injectDetailPage() {
    const uuid = extractUUID(window.location.href);
    if (!uuid) return;

    const id = `zl-detail-btn-${uuid}`;
    if (document.getElementById(id)) return;

    // Find a good action area on the detail page
    const possibleContainers = [
      document.querySelector('[class*="action-button"]'),
      document.querySelector('[class*="share"]'),
      document.querySelector('[class*="like"]'),
      document.querySelector('[class*="play"]')?.parentElement,
    ].filter(Boolean);

    const container = possibleContainers[0]?.parentElement ?? document.querySelector("main");
    if (!container) return;

    const btn    = document.createElement("button");
    btn.id        = id;
    btn.className = "zl-detail-import-btn";
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Import to Zoundlist`;

    btn.addEventListener("click", async () => {
      btn.disabled  = true;
      btn.textContent = "Importing…";
      const title    = document.title?.replace(/\s*[\|—]\s*Suno.*$/i, "").trim() ?? null;
      const coverImg = document.querySelector('meta[property="og:image"]');
      const coverUrl = coverImg?.getAttribute("content") ?? null;

      chrome.runtime.sendMessage({
        type: "QUEUE_TRACK",
        payload: { uuid, url: buildSongUrl(uuid), title, coverUrl, duration: null, albumId: null },
      }, (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          btn.disabled = false;
          btn.textContent = "⚠ Error — retry";
          return;
        }
        btn.textContent = "✓ Queued — check popup";
      });
    });

    // Append near the first found action area
    const target = possibleContainers[0]?.parentElement ?? container;
    target.insertBefore(btn, target.firstChild);
  }

  // ── Bulk action bar ────────────────────────────────────────────────────────
  function buildBulkBar() {
    if (document.getElementById("zl-bulk-bar")) return;

    const bar = document.createElement("div");
    bar.id = "zl-bulk-bar";
    bar.className = "hidden";
    bar.innerHTML = `
      <div id="zl-bulk-count">
        <span id="zl-count-num">0</span> selected
      </div>
      <button class="zl-bulk-select-all" id="zl-select-all">Select all visible</button>
      <div class="zl-format-toggle">
        <button id="zl-fmt-wav" class="active" title="Prefer WAV (lossless)">WAV</button>
        <button id="zl-fmt-mp3" title="Use MP3">MP3</button>
      </div>
      <button class="zl-bulk-import-btn" id="zl-do-import">
        ⬇ Import to Zoundlist
      </button>
      <button class="zl-bulk-close" id="zl-close-bar" title="Close">✕</button>
    `;
    document.body.appendChild(bar);

    document.getElementById("zl-fmt-wav").addEventListener("click", () => {
      preferredFormat = "wav";
      document.getElementById("zl-fmt-wav").classList.add("active");
      document.getElementById("zl-fmt-mp3").classList.remove("active");
    });
    document.getElementById("zl-fmt-mp3").addEventListener("click", () => {
      preferredFormat = "mp3";
      document.getElementById("zl-fmt-mp3").classList.add("active");
      document.getElementById("zl-fmt-wav").classList.remove("active");
    });

    document.getElementById("zl-select-all").addEventListener("click", selectAllVisible);
    document.getElementById("zl-do-import").addEventListener("click", importSelected);
    document.getElementById("zl-close-bar").addEventListener("click", deactivateSelectMode);
  }

  function activateSelectMode() {
    selectModeActive = true;
    buildBulkBar();
    updateBulkBar();
    const bar = document.getElementById("zl-bulk-bar");
    if (bar) bar.classList.remove("hidden");
  }

  function deactivateSelectMode() {
    selectModeActive = false;
    selectedUUIDs.clear();
    // Uncheck all
    document.querySelectorAll(".zl-select-checkbox").forEach(cb => (cb.checked = false));
    document.querySelectorAll(`.${ZL_ATTR}`).forEach(el => el.classList.remove("zl-card-selected"));
    const bar = document.getElementById("zl-bulk-bar");
    if (bar) bar.classList.add("hidden");
  }

  function updateBulkBar() {
    const countEl = document.getElementById("zl-count-num");
    if (countEl) countEl.textContent = selectedUUIDs.size;
  }

  function selectAllVisible() {
    document.querySelectorAll(`[${ZL_UUID}]`).forEach(card => {
      const uuid = card.getAttribute(ZL_UUID);
      if (!uuid) return;
      const cb = card.querySelector(".zl-select-checkbox");
      if (cb) cb.checked = true;
      selectedUUIDs.add(uuid);
      card.classList.add("zl-card-selected");
    });
    activateSelectMode();
    updateBulkBar();
  }

  async function importSelected() {
    if (selectedUUIDs.size === 0) return;
    const btn = document.getElementById("zl-do-import");
    if (btn) { btn.disabled = true; btn.textContent = "Queuing…"; }

    const tracks = [];
    for (const uuid of selectedUUIDs) {
      const card  = document.querySelector(`[${ZL_UUID}="${uuid}"]`);
      const title = card ? getCardTitle(card) : null;
      const cover = card ? getCardCover(card) : null;
      tracks.push({ uuid, url: buildSongUrl(uuid), title, coverUrl: cover, duration: null });
    }

    chrome.runtime.sendMessage({
      type: "QUEUE_TRACKS",
      payload: { tracks, albumId: null },
    }, (res) => {
      if (btn) {
        btn.textContent = res?.added
          ? `✓ ${res.added} queued — check popup`
          : "✓ Queued";
        setTimeout(() => { btn.disabled = false; btn.textContent = "⬇ Import to Zoundlist"; }, 3000);
      }
      deactivateSelectMode();
    });
  }

  // ── Main scan: find all song links and inject cards ─────────────────────────
  function scanAndInject(root) {
    const links = (root ?? document).querySelectorAll('a[href*="/song/"]');
    for (const link of links) {
      const uuid = extractUUID(link.href);
      if (!uuid) continue;
      const card = findCardContainer(link);
      if (card && !card.hasAttribute(ZL_ATTR)) {
        injectCard(card, uuid);
      }
    }

    // Song detail page
    if (window.location.pathname.match(/^\/song\//)) {
      injectDetailPage();
    }
  }

  // ── MutationObserver for SPA content changes ───────────────────────────────
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanAndInject(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ── SPA navigation detection ───────────────────────────────────────────────
  let lastHref = window.location.href;

  function onNavigation() {
    if (window.location.href === lastHref) return;
    lastHref = window.location.href;
    selectedUUIDs.clear();
    setTimeout(() => scanAndInject(), 800); // wait for React render
  }

  // Patch history API to detect SPA navigation
  const origPush    = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  history.pushState    = (...a) => { origPush(...a);    onNavigation(); };
  history.replaceState = (...a) => { origReplace(...a); onNavigation(); };
  window.addEventListener("popstate", onNavigation);

  // ── Listen for status updates from background ──────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "TRACK_STATUS") return;
    const { uuid, status } = msg.payload;
    const card = document.querySelector(`[${ZL_UUID}="${uuid}"]`);
    if (!card) return;
    const btn = card.querySelector(".zl-import-btn");
    if (!btn) return;

    switch (status) {
      case "analyzing":   setButtonState(btn, "loading", "Analyzing…"); break;
      case "downloading": setButtonState(btn, "loading", "Downloading…"); break;
      case "uploading":   setButtonState(btn, "loading", "Uploading…"); break;
      case "created":     setButtonState(btn, "done",    "✓ Imported"); break;
      case "failed":      setButtonState(btn, "error",   "⚠ Failed"); break;
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  scanAndInject();

  // Load format preference
  chrome.runtime.sendMessage({ type: "GET_PREFS" }, (res) => {
    if (!chrome.runtime.lastError && res?.prefs?.format) {
      preferredFormat = res.prefs.format;
    }
  });

})();
