import type { Metadata } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zoundlist.com";

// NOTE: Brand name in UI is temporarily "Sonoris" pending migration.
// Domain is zoundlist.com. Metadata uses zoundlist.com throughout.
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "Sonoris — Música para lo que estás creando",
    template: "%s | Sonoris",
  },

  description:
    "Música cinematográfica, editorial y ambient creada con IA y curada a mano. " +
    "Para video, podcast, iglesias y marcas. Licencia incluida en cada descarga.",

  keywords: [
    "música para videos",
    "música IA",
    "música para YouTube",
    "música para podcast",
    "música sin copyright",
    "música para creadores",
    "música worship",
    "licencia musical",
    "AI music",
    "royalty free music",
  ],

  openGraph: {
    type: "website",
    locale: "es_PR",
    url: APP_URL,
    siteName: "Sonoris", // TODO: update to Zoundlist on brand migration
    title: "Sonoris — Música para lo que estás creando",
    description:
      "Música cinematográfica creada con IA y curada a mano. " +
      "Licencia incluida en cada descarga.",
    images: [
      {
        url: "/og-image.png", // 1200x630 — add to public/ before launch
        width: 1200,
        height: 630,
        alt: "Sonoris — Música para lo que estás creando",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Sonoris — Música para lo que estás creando",
    description: "Música cinematográfica creada con IA. Licencia incluida.",
    images: ["/og-image.png"],
    // site: "@zoundlist", // uncomment when account exists
  },

  alternates: {
    canonical: APP_URL,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  // Web-only. No mobile app metadata.
  // No appLinks, no apple-app-site-association, no appleWebApp.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&f[]=general-sans@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
