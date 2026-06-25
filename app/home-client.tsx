"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Catalog, CoverVariant } from "@/types/catalog";
import { COVERS } from "@/lib/catalog/covers";
import { usePlayer } from "@/lib/use-player";
import { signInWithMagicLink } from "@/services/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ─── Helpers ───────────────────────────────────────────────────────────────

// Deterministic bars (avoids hydration mismatch + flicker)
function bars(seed: number, n: number): number[] {
  const out: number[] = [];
  let s = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(8 + (s / 233280) * 26);
  }
  return out;
}

function fmt(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function Play({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}
function Pause({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

// ─── Reusable pieces ─────────────────────────────────────────────────────────

function Cover({ variant, glyph, radius }: { variant: CoverVariant; glyph?: string; radius?: number }) {
  return (
    <div className="zl-cover" style={radius ? { borderRadius: radius } : undefined}>
      <div style={{ position: "absolute", inset: 0, background: COVERS[variant] }} />
      <div className="zl-cover__vignette" />
      {glyph && <span className="zl-cover__glyph">{glyph}</span>}
    </div>
  );
}

function ReleasePlay({ on, playing, size = 18 }: { on: boolean; playing: boolean; size?: number }) {
  return (
    <span className="zl-release__play" style={on ? { opacity: 1, transform: "translateY(0) scale(1)" } : undefined}>
      {on && playing ? <Pause size={size} /> : <Play size={size} />}
    </span>
  );
}

function SectionHeader({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc?: string; action?: string }) {
  return (
    <div className="zl-shead" data-reveal>
      <div>
        <span className="zl-eyebrow">{eyebrow}</span>
        <h2 className="zl-h2" style={{ marginTop: 12 }}>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action && (
        <a href="#catalog" className="zl-shead__link">{action} <Arrow /></a>
      )}
    </div>
  );
}

// ─── Home ──────────────────────────────────────────────────────────────────

export default function HomeClient({ catalog }: { catalog: Catalog }) {
  const { tracks, genres, moods } = catalog;

  // Derive curated sections from the catalog flags
  const featured = tracks.filter((t) => t.featured);
  const trending = tracks.filter((t) => t.trending);
  const newMusic = tracks.filter((t) => t.isNew);
  const staffList = tracks.filter((t) => t.staffPick && !t.staffHero);
  const staffHero = tracks.find((t) => t.staffHero) ?? tracks.find((t) => t.staffPick) ?? tracks[0];
  const heroQueue = (featured.length ? featured : tracks).slice(0, 3);
  const filters = [{ label: "Todo", value: "all" }, ...genres.map((g) => ({ label: g.name, value: g.slug }))];
  const genreName = (slug: string) => genres.find((g) => g.slug === slug)?.name ?? slug;

  const [scrolled, setScrolled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [heroIdx, setHeroIdx] = useState(0);

  // Real audio player (falls back to simulated progress for tracks without audio)
  const player = usePlayer();
  const playingTrack = tracks.find((t) => t.id === player.playingId);
  const heroTrack = playingTrack ?? heroQueue[heroIdx] ?? tracks[0];
  const heroOn = !!heroTrack && player.playingId === heroTrack.id;
  const heroBars = bars(7, 56);

  // Nav scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Keyboard: space toggles, escape closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); if (heroTrack) player.toggle(heroTrack); }
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [heroTrack, player]);

  // Track auth session → swaps nav buttons
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Open the modal if redirected here needing auth
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const flag = p.get("auth");
    if (flag === "required") { setAuthError("Inicia sesión para acceder a tu panel."); setModalOpen(true); }
    else if (flag === "error") { setAuthError("El enlace expiró o no es válido. Pide uno nuevo."); setModalOpen(true); }
  }, []);

  const selectQueue = (i: number) => { setHeroIdx(i); if (heroQueue[i]) player.toggle(heroQueue[i]); };
  const playedBars = Math.floor((heroOn ? player.progress : 0) * heroBars.length);
  const heroDur = heroTrack?.duration ?? "0:00";
  const timeDisplay = heroOn
    ? `${fmt(player.currentTime)} / ${player.duration ? fmt(player.duration) : heroDur}`
    : `0:00 / ${heroDur}`;

  const handleSubmit = async () => {
    setAuthError(null);
    if (!authEmail.trim()) { setAuthError("Escribe tu email."); return; }
    if (!isSupabaseConfigured) { setAuthError("Auth aún no configurado: faltan las claves de Supabase."); return; }
    setAuthLoading(true);
    const { error } = await signInWithMagicLink(authEmail.trim(), authName.trim() || undefined);
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    setFormSubmitted(true);
  };

  const closeModal = () => { setModalOpen(false); setAuthError(null); setFormSubmitted(false); };

  const filtered = activeFilter === "all" ? tracks : tracks.filter((t) => t.genre === activeFilter);

  return (
    <>
      {/* ── NAV ── */}
      <nav className={`zl-nav${scrolled ? " is-scrolled" : ""}`}>
        <div className="zl-wrap zl-nav__inner">
          <a href="/" className="zl-brand">
            <span className="zl-brand__mark">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3z" /></svg>
            </span>
            <span className="zl-brand__name">Sonoris</span>
          </a>

          <ul className="zl-nav__links zl-hide-md">
            <li><a href="#featured" className="zl-nav__link">Descubrir</a></li>
            <li><a href="#genres" className="zl-nav__link">Géneros</a></li>
            <li><a href="#moods" className="zl-nav__link">Moods</a></li>
            <li><a href="#license" className="zl-nav__link">Licencias</a></li>
            <li><a href="#pricing" className="zl-nav__link">Precios</a></li>
          </ul>

          <div className="zl-nav__actions">
            {user ? (
              <a href="/dashboard" className="zl-btn zl-btn--primary zl-btn--sm">Mi panel</a>
            ) : (
              <>
                <button className="zl-nav__login zl-hide-md" onClick={() => setModalOpen(true)}>Iniciar sesión</button>
                <button className="zl-btn zl-btn--primary zl-btn--sm" onClick={() => setModalOpen(true)}>Empezar gratis</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="zl-section" style={{ paddingTop: 152, paddingBottom: 72 }}>
        <div className="zl-wrap" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 64, alignItems: "center" }}>
          <div data-reveal>
            <span className="zl-badge" style={{ marginBottom: 26 }}>
              <span className="zl-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
              150+ tracks · curación humana cada semana
            </span>
            <h1 className="zl-display">
              Música para<br />lo que estás <em>creando.</em>
            </h1>
            <p className="zl-lead" style={{ margin: "26px 0 34px", maxWidth: 480 }}>
              Una plataforma de descubrimiento musical para video, podcast, iglesias y marcas.
              Curada a mano, cinematográfica, lista para publicar — con licencia incluida en cada descarga.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="zl-btn zl-btn--primary" onClick={() => document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" })}>
                Explorar el catálogo <Arrow />
              </button>
              <button className="zl-btn zl-btn--ghost" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
                Ver planes
              </button>
            </div>
            <div style={{ marginTop: 44, display: "flex", gap: 40, flexWrap: "wrap" }}>
              {[["150+", "Tracks curados"], [String(genres.length || 6), "Colecciones"], ["∞", "Nuevas cada semana"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.03em" }}>{n}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured player */}
          <div data-reveal>
            <div className="zl-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(110,59,255,0.6), transparent)" }} />
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
                <div style={{ width: 64, height: 64 }}><Cover variant={heroTrack.cover} glyph={heroTrack.glyph} radius={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>{heroOn && player.isPlaying ? "Sonando ahora" : "En el reproductor"}</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{heroTrack.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-2)", marginTop: 2 }}>{heroTrack.artist} · {heroTrack.bpm} BPM{heroTrack.audioUrl ? "" : " · preview"}</div>
                </div>
              </div>

              <div className="zl-wave" onClick={() => player.toggle(heroTrack)} role="button" aria-label={heroOn && player.isPlaying ? "Pausar" : "Reproducir"}>
                {heroBars.map((h, i) => (
                  <span key={i} style={{
                    height: h,
                    background: i < playedBars ? "linear-gradient(180deg, var(--purple-2), var(--purple))"
                      : i === playedBars ? "var(--lime)" : "rgba(255,255,255,0.12)",
                    transform: i === playedBars && heroOn && player.isPlaying ? "scaleY(1.2)" : "none",
                    animation: i === playedBars && heroOn && player.isPlaying ? "zl-eq 0.45s ease-in-out infinite alternate" : "none",
                  }} />
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button className="zl-iconbtn zl-play-main" onClick={() => player.toggle(heroTrack)} aria-label={heroOn && player.isPlaying ? "Pausar" : "Reproducir"}>
                    {heroOn && player.isPlaying ? <Pause /> : <Play />}
                  </button>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{timeDisplay}</span>
                </div>
                <button className="zl-btn zl-btn--lime zl-btn--sm" onClick={() => setModalOpen(true)}>Descargar</button>
              </div>

              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {heroQueue.map((t, i) => {
                  const on = player.playingId === t.id;
                  return (
                    <div key={t.id} className={`zl-queue-item${on ? " is-active" : ""}`} onClick={() => selectQueue(i)} role="button" aria-label={`Reproducir ${t.title}`}>
                      <span style={{ width: 16, textAlign: "center", fontSize: "0.75rem", color: on ? "var(--lime)" : "var(--text-3)" }}>
                        {on && player.isPlaying ? "♪" : i + 1}
                      </span>
                      <div style={{ width: 34, height: 34 }}><Cover variant={t.cover} radius={8} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{t.artist}</div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{t.duration}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── FEATURED RELEASES ── */}
      <section id="featured" className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Lanzamientos destacados" title="Estrenos de la semana" desc="Lo nuevo, escogido a mano por nuestro equipo de curación." action="Ver todo" />
          <div className="zl-rail" data-reveal>
            {featured.map((t) => (
              <button key={t.id} className="zl-release" onClick={() => player.toggle(t)} aria-label={`Reproducir ${t.title}`}>
                <Cover variant={t.cover} glyph={t.glyph} />
                <ReleasePlay on={player.playingId === t.id} playing={player.isPlaying} />
                <div className="zl-release__title">{t.title}</div>
                <div className="zl-release__meta">{t.artist} · {t.mood}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING TRACKS ── */}
      <section className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="En tendencia" title="Lo más sonado ahora" desc="Los tracks que más se están descargando esta semana." action="Explorar catálogo" />
          <div className="zl-tracks" data-reveal>
            {trending.map((t, i) => {
              const on = player.playingId === t.id;
              return (
                <button key={t.id} className={`zl-track${on ? " is-playing" : ""}`} onClick={() => player.toggle(t)} aria-label={`Reproducir ${t.title}`}>
                  <span className="zl-track__rank">{on ? (player.isPlaying ? <Pause size={13} /> : <Play size={13} />) : i + 1}</span>
                  <span className="zl-track__cover"><Cover variant={t.cover} glyph={t.glyph} radius={10} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span className="zl-track__title" style={{ display: "block" }}>{t.title}</span>
                    <span className="zl-track__meta" style={{ display: "block" }}>{t.artist} · {t.bpm} BPM · {t.mood}</span>
                  </span>
                  <span className="zl-track__dur">{t.duration}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STAFF PICKS (editorial) ── */}
      {staffHero && (
      <section className="zl-section">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Selección del equipo" title="Staff Picks" desc="Una pieza destacada y las que la acompañan, elegidas con criterio editorial." />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "stretch" }} className="zl-staff-grid">
            {/* Hero pick */}
            <button className="zl-release" onClick={() => player.toggle(staffHero)} style={{ position: "relative" }} aria-label={`Reproducir ${staffHero.title}`}>
              <div style={{ position: "relative", borderRadius: "var(--r-lg)", overflow: "hidden", aspectRatio: "16 / 11" }}>
                <div style={{ position: "absolute", inset: 0, background: COVERS[staffHero.cover] }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.78))" }} />
                <span className="zl-release__play" style={{ width: 56, height: 56, ...(player.playingId === staffHero.id ? { opacity: 1, transform: "translateY(0) scale(1)" } : {}) }}>{player.playingId === staffHero.id && player.isPlaying ? <Pause size={22} /> : <Play size={22} />}</span>
                <div style={{ position: "absolute", left: 26, bottom: 24, right: 26 }}>
                  <span className="zl-tag" style={{ marginBottom: 12, display: "inline-block" }}>Pick de la semana</span>
                  <div style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>{staffHero.title}</div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{staffHero.artist} · {staffHero.bpm} BPM · {staffHero.duration}</div>
                </div>
              </div>
            </button>

            {/* Curator note + list */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="zl-card" style={{ padding: 22, marginBottom: 16 }}>
                <p style={{ fontSize: "1.02rem", lineHeight: 1.6, color: "var(--text)", fontWeight: 500 }}>
                  “{staffHero.staffNote ?? "Una selección con criterio editorial: lista para tu próximo proyecto."}”
                </p>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--purple), var(--purple-2))" }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>Curado por <strong style={{ color: "var(--text)" }}>el equipo Sonoris</strong></span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {staffList.map((t, i) => {
                  const on = player.playingId === t.id;
                  return (
                    <button key={t.id} className={`zl-track${on ? " is-playing" : ""}`} onClick={() => player.toggle(t)} style={{ gridTemplateColumns: "26px 46px 1fr auto" }} aria-label={`Reproducir ${t.title}`}>
                      <span className="zl-track__rank">{on ? (player.isPlaying ? <Pause size={12} /> : <Play size={12} />) : i + 1}</span>
                      <span style={{ width: 46, height: 46 }}><Cover variant={t.cover} glyph={t.glyph} radius={9} /></span>
                      <span style={{ minWidth: 0 }}>
                        <span className="zl-track__title" style={{ display: "block" }}>{t.title}</span>
                        <span className="zl-track__meta" style={{ display: "block" }}>{t.artist} · {t.mood}</span>
                      </span>
                      <span className="zl-track__dur">{t.duration}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── NEW MUSIC ── */}
      <section className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Novedades" title="Recién añadido" desc="Pistas frescas que acaban de entrar al catálogo." action="Ver novedades" />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }} className="zl-new-grid">
            {newMusic.map((t) => (
              <button key={t.id} className="zl-release" onClick={() => player.toggle(t)} aria-label={`Reproducir ${t.title}`}>
                <div style={{ position: "relative" }}>
                  <Cover variant={t.cover} glyph={t.glyph} />
                  <span className="zl-pill-new" style={{ position: "absolute", top: 12, left: 12 }}>Nuevo</span>
                  <ReleasePlay on={player.playingId === t.id} playing={player.isPlaying} />
                </div>
                <div className="zl-release__title">{t.title}</div>
                <div className="zl-release__meta">{t.artist} · {t.duration}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── GENRE COLLECTIONS ── */}
      <section id="genres" className="zl-section">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Colecciones por género" title="Explora por estilo" desc="Del cine al culto, del lo-fi al corporativo. Encuentra el tono exacto de tu proyecto." />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }} className="zl-coll-grid">
            {genres.map((g) => (
              <button key={g.slug} className="zl-collection" onClick={() => { setActiveFilter(g.slug); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }} aria-label={`Colección ${g.name}`}>
                <div className="zl-collection__bg" style={{ background: COVERS[g.cover] }} />
                <div className="zl-collection__shade" />
                <div className="zl-collection__body">
                  <span style={{ fontSize: "1.4rem" }}>{g.glyph}</span>
                  <div style={{ marginTop: "auto" }}>
                    <div className="zl-collection__name">{g.name}</div>
                    <div className="zl-collection__count">{g.trackCount} tracks</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOOD COLLECTIONS ── */}
      <section id="moods" className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Colecciones por mood" title="Encuentra el sentimiento" desc="A veces no buscas un género — buscas una emoción." />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 18 }} className="zl-mood-grid">
            {moods.map((m) => (
              <button key={m.slug} className="zl-collection" style={{ aspectRatio: "3 / 4" }} aria-label={`Mood ${m.name}`}>
                <div className="zl-collection__bg" style={{ background: COVERS[m.cover] }} />
                <div className="zl-collection__shade" />
                <div className="zl-collection__body" style={{ padding: 16 }}>
                  <div style={{ marginTop: "auto" }}>
                    <div className="zl-collection__name" style={{ fontSize: "1.05rem" }}>{m.name}</div>
                    <div className="zl-collection__count">{m.trackCount}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATALOG (filterable) ── */}
      <section id="catalog" className="zl-section">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Catálogo completo" title="Escucha antes de decidir" desc="Cada pista fue escuchada y aprobada por productores. Si no la pondríamos en un proyecto de cliente, no entra." />
          <div data-reveal style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {filters.map((f) => (
              <button key={f.value} className={`zl-chip${activeFilter === f.value ? " is-active" : ""}`} onClick={() => setActiveFilter(f.value)}>{f.label}</button>
            ))}
          </div>
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24 }}>
            {filtered.map((t) => (
              <button key={t.id} className="zl-release" onClick={() => player.toggle(t)} aria-label={`Reproducir ${t.title}`}>
                <Cover variant={t.cover} glyph={t.glyph} />
                <ReleasePlay on={player.playingId === t.id} playing={player.isPlaying} />
                <div className="zl-release__title">{t.title}</div>
                <div className="zl-release__meta">{t.artist} · {t.bpm} BPM · {t.duration}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <span className="zl-tag">{t.mood}</span>
                  <span className="zl-tag">{genreName(t.genre)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── LICENSE / CERTIFICATE ── */}
      <section id="license" className="zl-section">
        <div className="zl-wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          <div className="zl-card" data-reveal style={{ padding: 30 }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700 }}>Sonoris</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Certificado de Licencia</span>
            </div>
            {[
              ["N° de Certificado", "SNR-2026-00847"],
              ["Track", "Midnight Drive"],
              ["ID de Track", "TRK-00291"],
              ["Plan", "Creator"],
              ["Fecha", "23 jun 2026"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: "0.84rem" }}>
                <span style={{ color: "var(--text-3)" }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 18, padding: 16, background: "var(--lime-dim)", border: "1px solid rgba(205,255,79,0.25)", borderRadius: "var(--r-sm)" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--lime)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Alcance de Licencia</div>
              {["YouTube y plataformas de video", "Instagram, TikTok, Facebook, X", "Podcast y audio", "Transmisiones en vivo"].map((it) => (
                <div key={it} style={{ display: "flex", gap: 8, fontSize: "0.82rem", color: "var(--text-2)", padding: "3px 0" }}>
                  <span style={{ color: "var(--lime)" }}>✓</span> {it}
                </div>
              ))}
            </div>
          </div>

          <div data-reveal>
            <span className="zl-eyebrow">Descarga con tranquilidad</span>
            <h2 className="zl-h2" style={{ margin: "12px 0 18px" }}>Descarga hoy.<br />Publica mañana.<br />Sin preocupaciones.</h2>
            <p className="zl-muted" style={{ lineHeight: 1.7, marginBottom: 28 }}>
              Cada descarga incluye un certificado de licencia generado automáticamente.
              Guárdalo en el expediente del proyecto: si alguna vez necesitas demostrar que la música está en orden, ya lo tienes.
            </p>
            {[
              ["Sale solo, sin pedirlo", "Cada descarga genera su certificado en PDF, con todo lo que necesitas para el expediente."],
              ["Sabemos qué hay en cada pista", "Qué herramienta la generó, cuándo y con qué acuerdos vigentes. Todo documentado."],
              ["Lo que publicas queda tuyo", "El contenido que subes con plan activo sigue licenciado aunque canceles. Sin fecha de vencimiento."],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple-2)", marginTop: 7, flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: 3 }}>{title}</h4>
                  <p style={{ fontSize: "0.84rem", color: "var(--text-2)", lineHeight: 1.55 }}>{desc}</p>
                </div>
              </div>
            ))}
            <button className="zl-btn zl-btn--primary" style={{ marginTop: 10 }} onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}>
              Explorar el catálogo <Arrow />
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="zl-section">
        <div className="zl-wrap">
          <div data-reveal style={{ textAlign: "center", marginBottom: 44, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            <span className="zl-eyebrow">Precios</span>
            <h2 className="zl-h2" style={{ margin: "12px 0 14px" }}>Elige tu plan</h2>
            <p className="zl-muted">Empieza gratis. Escucha todo el catálogo antes de decidir.</p>
          </div>
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }} className="zl-pricing-grid">
            {[
              { tier: "Free", color: "var(--text-3)", price: "$0", period: "/mes", note: " ", desc: "Escucha el catálogo completo sin compromiso. Sin tarjeta.", cta: "Explorar gratis", style: "ghost", featured: false,
                features: [[true, "Preview de 30s de todo"], [false, "Descarga de tracks"], [false, "Certificado de licencia"], [false, "Uso comercial"]] },
              { tier: "Creator", color: "var(--purple-2)", price: "$9", period: "/mes", note: "$7/mes anual · ahorra $24", desc: "Para creadores que publican de forma regular y necesitan música nueva constante.", cta: "Empezar con Creator", style: "primary", featured: true,
                features: [[true, "Catálogo completo en MP3"], [true, "Descargas ilimitadas"], [true, "Certificado de licencia PDF"], [true, "YouTube, Podcast, RRSS"], [false, "WAV lossless"], [false, "Anuncios pagados"]] },
              { tier: "Pro", color: "var(--orange)", price: "$19", period: "/mes", note: "$15/mes anual · ahorra $48", desc: "Para videógrafos y agencias que entregan a clientes y necesitan lossless.", cta: "Empezar con Pro", style: "ghost", featured: false,
                features: [[true, "Todo lo de Creator"], [true, "WAV lossless"], [true, "Licencia comercial completa"], [true, "Anuncios digitales pagados"], [true, "Videos corporativos y apps"], [true, "Prioridad en nuevos tracks"]] },
              { tier: "Iglesias / ONGs", color: "var(--lime)", price: "$5", period: "/mes", note: "Exclusivo uso no comercial", desc: "Para iglesias y ministerios que producen contenido de culto.", cta: "Plan para iglesias", style: "lime", featured: false,
                features: [[true, "Catálogo completo en MP3"], [true, "Descargas ilimitadas"], [true, "Certificado de licencia"], [true, "Cultos, eventos, streaming"], [false, "Uso comercial"], [false, "WAV o broadcast"]] },
            ].map((p) => (
              <div key={p.tier} className={`zl-plan${p.featured ? " is-featured" : ""}`}>
                {p.featured && <span style={{ position: "absolute", top: 14, right: 14 }} className="zl-pill-new">Popular</span>}
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: p.color, marginBottom: 14 }}>{p.tier}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{p.price}</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>{p.period}</span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--lime)", margin: "8px 0 18px", minHeight: 18 }}>{p.note}</div>
                <p style={{ fontSize: "0.84rem", color: "var(--text-2)", lineHeight: 1.55, marginBottom: 22, flex: 1 }}>{p.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
                  {p.features.map(([ok, text], i) => (
                    <li key={i} style={{ display: "flex", gap: 9, fontSize: "0.82rem", color: ok ? "var(--text-2)" : "var(--text-3)" }}>
                      <span style={{ color: ok ? "var(--lime)" : "var(--text-3)", flexShrink: 0 }}>{ok ? "✓" : "✕"}</span>{text as string}
                    </li>
                  ))}
                </ul>
                <button
                  className={`zl-btn zl-btn--block ${p.style === "primary" ? "zl-btn--primary" : p.style === "lime" ? "zl-btn--lime" : "zl-btn--ghost"}`}
                  onClick={() => setModalOpen(true)}
                >{p.cta}</button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 26, fontSize: "0.82rem", color: "var(--text-3)" }}>
            Todo lo que publicas con tu plan activo queda licenciado para siempre · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "44px 0", position: "relative", zIndex: 1 }}>
        <div className="zl-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <a href="/" className="zl-brand">
            <span className="zl-brand__mark">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3z" /></svg>
            </span>
            <span className="zl-brand__name">Sonoris</span>
          </a>
          <ul style={{ display: "flex", gap: 24, listStyle: "none", flexWrap: "wrap" }}>
            {[
              ["Términos de licencia", "/licencia"],
              ["Privacidad", "/privacidad"],
              ["Términos de uso", "/terminos"],
              ["Contacto", "mailto:legal@zoundlist.com"],
            ].map(([label, href]) => (
              <li key={label}><a href={href} className="zl-foot-link">{label}</a></li>
            ))}
          </ul>
          <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>© 2026 Sonoris · JM Creativos LLC · Puerto Rico</p>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {modalOpen && (
        <div className="zl-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }} role="dialog" aria-modal="true" aria-label="Registro">
          <div className="zl-modal">
            <button className="zl-modal__close" onClick={closeModal} aria-label="Cerrar">✕</button>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>Escucha el catálogo completo</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: 24 }}>Crea tu cuenta gratis y accede a todo. Sin tarjeta, sin compromiso.</p>
            {formSubmitted ? (
              <div style={{ textAlign: "center", padding: "20px 4px" }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>📬</div>
                <div style={{ color: "var(--lime)", fontWeight: 700, marginBottom: 6 }}>Revisa tu email</div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.55 }}>
                  Te enviamos un enlace mágico a <strong style={{ color: "var(--text)" }}>{authEmail}</strong>. Ábrelo para entrar a tu panel.
                </p>
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Nombre</label>
                <input className="zl-input" type="text" placeholder="Tu nombre" value={authName} onChange={(e) => setAuthName(e.target.value)} style={{ marginBottom: 16 }} />
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Email</label>
                <input className="zl-input" type="email" placeholder="tuemail@ejemplo.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} style={{ marginBottom: authError ? 12 : 22 }} />
                {authError && (
                  <p style={{ fontSize: "0.8rem", color: "var(--orange)", marginBottom: 18, lineHeight: 1.45 }}>{authError}</p>
                )}
                <button className="zl-btn zl-btn--primary zl-btn--block" onClick={handleSubmit} disabled={authLoading}>
                  {authLoading ? "Enviando…" : <>Crear cuenta gratis <Arrow /></>}
                </button>
                <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 12 }}>Te enviaremos un link mágico. Sin contraseñas.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 980px) {
          header.zl-section > .zl-wrap { grid-template-columns: 1fr !important; gap: 48px !important; }
          #license > .zl-wrap { grid-template-columns: 1fr !important; }
          .zl-staff-grid { grid-template-columns: 1fr !important; }
          .zl-coll-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-new-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-mood-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .zl-pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .zl-coll-grid, .zl-new-grid, .zl-pricing-grid { grid-template-columns: 1fr !important; }
          .zl-mood-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  );
}
