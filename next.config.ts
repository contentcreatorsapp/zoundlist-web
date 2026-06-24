import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Web-only. No Capacitor, no mobile, no app links.
  // Domain: zoundlist.com (connected via Vercel)
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
