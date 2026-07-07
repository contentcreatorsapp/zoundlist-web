// ── Zoundlist Auth Content Script ────────────────────────────────────────────
// Runs on zoundlist.com/* — fetches session JWT via cookie-auth API endpoint
// and sends it to the extension background service worker.
//
// Why API endpoint instead of localStorage:
//   @supabase/ssr stores sessions in HttpOnly cookies, not localStorage.
//   The /api/extension/auth/token route reads the cookie on the server and
//   returns the access_token safely.

(function () {
  "use strict";

  async function sendAuthToExtension() {
    try {
      const res = await fetch("/api/extension/auth/token", {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) return; // not logged in or endpoint error

      const { accessToken, expiresAt } = await res.json();
      if (!accessToken) return;

      chrome.runtime.sendMessage(
        { type: "SET_AUTH", payload: { accessToken, refreshToken: null, expiresAt: expiresAt ?? null } },
        (response) => {
          if (chrome.runtime.lastError) return;
          if (response?.ok) {
            console.log("[Zoundlist Extension] Auth connected.");
          }
        }
      );
    } catch {
      // Extension not installed, user not logged in, or network error — ignore.
    }
  }

  // Run immediately
  sendAuthToExtension();

  // Re-run on focus (handles the case where the user logged in on another tab)
  window.addEventListener("focus", sendAuthToExtension);
})();
