// ── Zoundlist Auth Content Script ────────────────────────────────────────────
// Runs on zoundlist.com/* — reads Supabase session and sends token to extension.

(function () {
  "use strict";

  function extractSupabaseSession() {
    try {
      // Find the Supabase session key — pattern: sb-{project_ref}-auth-token
      const key = Object.keys(localStorage).find(
        k => k.startsWith("sb-") && k.endsWith("-auth-token")
      );
      if (!key) return null;

      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      // Supabase stores either the session directly or nested under a key
      const session = parsed?.session ?? parsed;
      if (!session?.access_token) return null;

      return {
        accessToken:  session.access_token,
        refreshToken: session.refresh_token ?? null,
        expiresAt:    session.expires_at ?? null,
      };
    } catch {
      return null;
    }
  }

  function sendAuthToExtension() {
    const session = extractSupabaseSession();
    if (!session) return;

    chrome.runtime.sendMessage({ type: "SET_AUTH", payload: session }, (response) => {
      if (chrome.runtime.lastError) return; // extension not installed or unavailable
      if (response?.ok) {
        console.log("[Zoundlist Extension] Auth connected.");
      }
    });
  }

  // Send immediately
  sendAuthToExtension();

  // Also re-send if localStorage changes (token refresh)
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith("sb-") && e.key?.endsWith("-auth-token")) {
      sendAuthToExtension();
    }
  });
})();
