import Image from "next/image";
import Link from "next/link";

const RATIO = 774 / 146; // official wordmark aspect ratio

/** Official Zoundlist wordmark, linking home. */
export function Brand({ height = 24, href = "/" }: { height?: number; href?: string }) {
  return (
    <Link href={href} aria-label="Zoundlist — inicio" style={{ display: "inline-flex", alignItems: "center" }}>
      <Image
        src="/zoundlist-wordmark.png"
        alt="Zoundlist"
        height={height}
        width={Math.round(height * RATIO)}
        priority
        style={{ height, width: "auto", display: "block" }}
      />
    </Link>
  );
}
