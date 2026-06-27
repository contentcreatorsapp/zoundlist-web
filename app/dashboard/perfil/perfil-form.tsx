"use client";

import { useState, useRef } from "react";
import type { Profile } from "@/services/profile";
import { createClient } from "@/lib/supabase/client";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "";
}

export function PerfilForm({ profile }: { profile: Profile }) {
  const [artistName, setArtistName] = useState(profile.artistName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [instagram, setInstagram] = useState(profile.instagram ?? "");
  const [youtube, setYoutube] = useState(profile.youtube ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");

  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl ?? "");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl ?? "");
  const [bannerPreview, setBannerPreview] = useState(profile.bannerUrl ?? "");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, bucket: string, filename: string): Promise<string> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${filename}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleAvatar = async (file: File) => {
    setAvatarPreview(URL.createObjectURL(file));
    try {
      const url = await uploadFile(file, "avatars", "avatar");
      setAvatarUrl(url);
    } catch { setMsg({ type: "err", text: "Error subiendo la foto de perfil." }); }
  };

  const handleBanner = async (file: File) => {
    setBannerPreview(URL.createObjectURL(file));
    try {
      const url = await uploadFile(file, "banners", "banner");
      setBannerUrl(url);
    } catch { setMsg({ type: "err", text: "Error subiendo el banner." }); }
  };

  const handleSave = async () => {
    setMsg(null);
    if (!artistName.trim()) { setMsg({ type: "err", text: "El nombre artístico es obligatorio." }); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const slug = slugify(artistName);
      const { error } = await supabase.from("profiles").update({
        artist_name: artistName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
        banner_url: bannerUrl || null,
        instagram: instagram.replace(/^@/, "").trim() || null,
        youtube: youtube.trim() || null,
        website: website.trim() || null,
        artist_slug: slug || null,
      }).eq("id", profile.id);
      if (error) throw error;
      setMsg({ type: "ok", text: "¡Perfil guardado! Tu página pública está en /artistas/" + slug });
    } catch (e: unknown) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error al guardar." });
    } finally { setSaving(false); }
  };

  const label: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" };
  const field: React.CSSProperties = { marginBottom: 24 };

  return (
    <div>
      {/* Banner */}
      <div
        onClick={() => bannerRef.current?.click()}
        style={{
          position: "relative", width: "100%", height: 200, borderRadius: "var(--r)",
          background: bannerPreview ? `url(${bannerPreview}) center/cover no-repeat` : "linear-gradient(135deg, #111 0%, #1a1a1a 50%, #0f1a0a 100%)",
          border: "1px solid var(--border)", cursor: "pointer", overflow: "hidden", marginBottom: 0,
        }}
      >
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
          background: bannerPreview ? "rgba(0,0,0,0.45)" : "transparent",
          opacity: bannerPreview ? 0 : 1, transition: "opacity 0.2s",
        }}
          className="banner-hint"
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = bannerPreview ? "0" : "1")}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{bannerPreview ? "Cambiar banner" : "Subir banner · 1440 × 400 px"}</span>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleBanner(e.target.files[0])} />
      </div>

      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: -36, marginBottom: 32, paddingLeft: 24 }}>
        <div
          onClick={() => avatarRef.current?.click()}
          style={{
            width: 88, height: 88, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
            background: avatarPreview ? `url(${avatarPreview}) center/cover no-repeat` : "var(--surface)",
            border: "3px solid var(--bg)", position: "relative", overflow: "hidden",
          }}
        >
          {!avatarPreview && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
        </div>
        <div style={{ paddingBottom: 6 }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: 0 }}>Foto de perfil · 400 × 400 px recomendado</p>
        </div>
      </div>

      {/* Fields */}
      <div className="zl-card" style={{ padding: 32 }}>
        <div style={field}>
          <label style={label}>Nombre artístico *</label>
          <input className="zl-input" type="text" placeholder="Tu nombre o alias" value={artistName} onChange={e => setArtistName(e.target.value)} />
          {artistName && <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: 6 }}>Tu URL: zoundlist.com/artistas/{slugify(artistName)}</p>}
        </div>

        <div style={field}>
          <label style={label}>Biografía</label>
          <textarea
            className="zl-input"
            rows={4}
            placeholder="Cuéntale al mundo quién eres y qué música haces..."
            value={bio}
            onChange={e => setBio(e.target.value)}
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={field}>
            <label style={label}>Instagram</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", fontSize: "0.9rem" }}>@</span>
              <input className="zl-input" type="text" placeholder="tuusuario" value={instagram} onChange={e => setInstagram(e.target.value)} style={{ paddingLeft: 28 }} />
            </div>
          </div>
          <div style={field}>
            <label style={label}>YouTube</label>
            <input className="zl-input" type="text" placeholder="URL de tu canal en YouTube" value={youtube} onChange={e => setYoutube(e.target.value)} />
          </div>
        </div>

        <div style={field}>
          <label style={label}>Sitio web</label>
          <input className="zl-input" type="url" placeholder="https://tuwebsite.com" value={website} onChange={e => setWebsite(e.target.value)} />
        </div>

        {msg && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--r)", marginBottom: 20, fontSize: "0.86rem", background: msg.type === "ok" ? "rgba(149,249,8,0.08)" : "rgba(255,122,69,0.08)", border: `1px solid ${msg.type === "ok" ? "rgba(149,249,8,0.25)" : "rgba(255,122,69,0.3)"}`, color: msg.type === "ok" ? "var(--brand)" : "var(--orange)" }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="zl-btn zl-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar perfil"}
          </button>
          {profile.artistSlug && (
            <a href={`/artistas/${profile.artistSlug}`} className="zl-btn zl-btn--ghost" target="_blank" rel="noopener noreferrer">
              Ver perfil público →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
