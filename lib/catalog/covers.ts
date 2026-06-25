import type { CoverVariant } from "@/types/catalog";

/**
 * Gradient-mesh "album art" — premium covers rendered purely in CSS,
 * so the catalog needs no uploaded images yet. Keyed by cover variant.
 */
// Brand-aligned cover palette: Zoundlist green (#95f908) as the hero,
// varied with teal / mint / olive / cool darks. Cohesive, no rainbow.
export const COVERS: Record<CoverVariant, string> = {
  violet:  "radial-gradient(120% 120% at 20% 18%, #95F908 0%, transparent 50%), radial-gradient(120% 120% at 85% 8%, #0f7a3a 0%, transparent 48%), linear-gradient(155deg, #0c1a10, #0a0a0a)",
  lime:    "radial-gradient(120% 120% at 80% 18%, #B6FF3A 0%, transparent 48%), radial-gradient(110% 110% at 10% 90%, #6fae0a 0%, transparent 50%), linear-gradient(155deg, #141a08, #0a0a0a)",
  orange:  "radial-gradient(120% 120% at 22% 80%, #C8E636 0%, transparent 50%), radial-gradient(110% 110% at 90% 12%, #4d7a12 0%, transparent 46%), linear-gradient(155deg, #16180a, #0a0a0a)",
  magenta: "radial-gradient(120% 120% at 80% 78%, #2BD6A0 0%, transparent 50%), radial-gradient(110% 110% at 12% 16%, #95F908 0%, transparent 44%), linear-gradient(155deg, #08160f, #0a0a0a)",
  teal:    "radial-gradient(120% 120% at 24% 24%, #2BD6C0 0%, transparent 50%), radial-gradient(110% 110% at 88% 86%, #1f9e7a 0%, transparent 46%), linear-gradient(155deg, #08161a, #0a0a0a)",
  gold:    "radial-gradient(120% 120% at 80% 22%, #B9FFD0 0%, transparent 46%), radial-gradient(110% 110% at 12% 88%, #46c46a 0%, transparent 50%), linear-gradient(155deg, #0c1612, #0a0a0a)",
  ice:     "radial-gradient(120% 120% at 24% 18%, #E8EFE6 0%, transparent 48%), radial-gradient(110% 110% at 86% 88%, #95F908 0%, transparent 32%), linear-gradient(155deg, #14161a, #0a0a0a)",
  ember:   "radial-gradient(120% 120% at 78% 76%, #95F908 0%, transparent 42%), radial-gradient(110% 110% at 16% 16%, #1a3a1f 0%, transparent 50%), linear-gradient(155deg, #101410, #0a0a0a)",
};
