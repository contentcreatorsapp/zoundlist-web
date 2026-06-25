import type { CoverVariant } from "@/types/catalog";

/**
 * Gradient-mesh "album art" — premium covers rendered purely in CSS,
 * so the catalog needs no uploaded images yet. Keyed by cover variant.
 */
export const COVERS: Record<CoverVariant, string> = {
  violet:  "radial-gradient(120% 120% at 18% 18%, #8B6BFF 0%, transparent 52%), radial-gradient(120% 120% at 86% 4%, #6E3BFF 0%, transparent 46%), linear-gradient(155deg, #1a1230, #0d0d0d)",
  lime:    "radial-gradient(120% 120% at 82% 16%, #CDFF4F 0%, transparent 46%), radial-gradient(110% 110% at 8% 92%, #4f6f1a 0%, transparent 52%), linear-gradient(155deg, #161a0c, #0d0d0d)",
  orange:  "radial-gradient(120% 120% at 20% 82%, #FF8B3D 0%, transparent 52%), radial-gradient(110% 110% at 92% 10%, #ff4d6d 0%, transparent 46%), linear-gradient(155deg, #20120a, #0d0d0d)",
  magenta: "radial-gradient(120% 120% at 80% 80%, #ff4db8 0%, transparent 50%), radial-gradient(110% 110% at 10% 14%, #7a2bff 0%, transparent 48%), linear-gradient(155deg, #1c0f1e, #0d0d0d)",
  teal:    "radial-gradient(120% 120% at 22% 24%, #2bd6c0 0%, transparent 50%), radial-gradient(110% 110% at 88% 86%, #2b7bff 0%, transparent 48%), linear-gradient(155deg, #0a1a1c, #0d0d0d)",
  gold:    "radial-gradient(120% 120% at 80% 22%, #f7c752 0%, transparent 48%), radial-gradient(110% 110% at 12% 88%, #ff8b3d 0%, transparent 50%), linear-gradient(155deg, #1d160a, #0d0d0d)",
  ice:     "radial-gradient(120% 120% at 24% 18%, #9fd2ff 0%, transparent 50%), radial-gradient(110% 110% at 86% 88%, #8B6BFF 0%, transparent 48%), linear-gradient(155deg, #11161f, #0d0d0d)",
  ember:   "radial-gradient(120% 120% at 78% 76%, #ff5e3d 0%, transparent 50%), radial-gradient(110% 110% at 16% 16%, #ff2d55 0%, transparent 46%), linear-gradient(155deg, #1e0e0c, #0d0d0d)",
};
