import { COVERS } from "@/lib/catalog/covers";
import type { CoverVariant } from "@/types/catalog";

interface Props {
  variant: CoverVariant;
  glyph?: string;
  radius?: number;
  image?: string | null;
}

export function Cover({ variant, glyph, radius, image }: Props) {
  return (
    <div className="zl-cover" style={radius ? { borderRadius: radius } : undefined}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: COVERS[variant] }} />
      )}
      <div className="zl-cover__vignette" />
      {!image && glyph && <span className="zl-cover__glyph">{glyph}</span>}
    </div>
  );
}
