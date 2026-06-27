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
                  href={artist.spotify.startsWith("http") ? artist.spotify : `https://open.spotify.com/artist/${artist.spotify}`}
                  target="_blank" rel="noopener noreferrer"
                  className="zl-btn zl-btn--ghost zl-btn--sm"
                  style={{ display: "flex", alignItems: "center", gap: 7 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Spotify
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
