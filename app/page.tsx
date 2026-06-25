import { getCatalog } from "@/services/catalog";
import HomeClient from "./home-client";

// Public catalog: cached and revalidated every 60s (ISR).
export const revalidate = 60;

export default async function HomePage() {
  const catalog = await getCatalog();
  return <HomeClient catalog={catalog} />;
}
