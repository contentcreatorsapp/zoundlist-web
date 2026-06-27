import { notFound } from "next/navigation";
import { getPublicArtist } from "@/services/profile";
import { Brand } from "@/components/brand";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getPublicArtist(slug);
  if (!artist) return { title: "Artista · Zoundlist" };
  const name = artist.artistName ?? artist.fullName ?? "Artista";
  return {
    title: `${name} · Zoundlist`,
    description: artist.bio ?? `Música de ${name} en Zoundlist.`,
    openGraph: { images: artist.avatarUrl ? [{ url: artist.avatarUrl }] : [] },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getPublicArtist(slug);
  if (!artist) notFound();

  const name = artist.artistName ?? artist.fullName ?? "Artista";

  return (
    <main style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid var(--border)", position: "relative", zIndex: 10 }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/"><Brand height={22} /></a>
          <a href="/" className="zl-btn zl-btn--ghost zl-btn--sm">Explorar música</a>
        </div>
      </header>

      {/* Banner */}
      <div style={{
        width: "100%", height: 280, position: "relative", overflow: "hidden",
        background: artist.bannerUrl
          ? `url(${artist.bannerUrl}) center/cover no-repeat`
          : "linear-gradient(135deg, #0d1a06 0%, #111 40%, #0a1a14 100%)",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(13,13,13,0.9) 100%)" }} />
      </div>

      {/* Profile info */}
      <div className="zl-wrap" style={{ marginTop: -60, position: "relative", zIndex: 2, paddingBottom: 80 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 28 }}>
          {/* Avatar */}
          <div style={{
            width: 112, height: 112, borderRadius: "50%", flexShrink: 0,
            border: "4px solid var(--bg)", overflow: "hidden",
            background: artist.avatarUrl ? `url(${artist.avatarUrl}) center/cover no-repeat` : "var(--surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {!artist.avatarUrl && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>

          <div style={{ paddingBottom: 4 }}>
            <span className="zl-eyebrow" style={{ marginBottom: 6, display: "block" }}>Artista en Zoundlist</span>
            <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, color: "var(--text)", margin: 0, lineHeight: 1.1 }}>{name}</h1>
          </div>
        </div>

        <div style={{ maxWidth: 640 }}>
          {artist.bio && (
            <p style={{ fontSize: "1rem", color: "var(--text-2)", lineHeight: 1.7, marginBottom: 24 }}>{artist.bio}</p>
          )}

          {/* Social links */}
          {(artist.instagram || artist.spotify || artist.website) && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {artist.instagram && (
                <a
                  href={`https://instagram.com/${artist.instagram}`}
                  target="_blank" rel="noopener noreferrer"
                  className="zl-btn zl-btn--ghost zl-btn--sm"
                  style={{ display: "flex", alignItems: "center", gap: 7 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  @{artist.instagram}
                </a>
              )}
              {artist.spotify && (
                <a
                  href={artist.spotify.startsWith("http") ? artist.spotify : `https://youtube.com/@${artist.spotify}`}
                  target="_blank" rel="noopener noreferrer"
                  className="zl-btn zl-btn--ghost zl-btn--sm"
                  style={{ display: "flex", alignItems: "center", gap: 7 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  YouTube
                </a>
              )}
              {artist.website && (
                <a
                  href={artist.website}
                  target="_blank" rel="noopener noreferrer"
                  className="zl-btn zl-btn--ghost zl-btn--sm"
                  style={{ display: "flex", alignItems: "center", gap: 7 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Web
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tracks — coming in Phase B */}
        <div style={{ marginTop: 56 }}>
          <h2 className="zl-h2" style={{ fontSize: "1.3rem", marginBottom: 24 }}>Música</h2>
          <div className="zl-card" style={{ padding: "40px 32px", textAlign: "center" }}>
            <p className="zl-muted">Los tracks de este artista aparecerán aquí pronto.</p>
            <a href="/" className="zl-btn zl-btn--primary" style={{ marginTop: 20 }}>Explorar catálogo</a>
          </div>
        </div>
      </div>
    </main>
  );
}
