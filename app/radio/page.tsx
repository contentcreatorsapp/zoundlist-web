import type { Metadata } from "next";
import { getCatalog } from "@/services/catalog";
import RadioClient from "./radio-client";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Radio",
  description:
    "Descubre música nueva continuamente. Curada a mano por el equipo Zoundlist — cinematográfica, editorial, sin parar.",
};

export default async function RadioPage() {
  const catalog = await getCatalog();
  return <RadioClient catalog={catalog} />;
}
