import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zoundlist.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE_URL,                 lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/terminos`,   lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/privacidad`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/licencia`,   lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];
}
