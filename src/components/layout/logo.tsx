import Image from "next/image";
import Link from "next/link";
export function Logo({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean;
  compact?: boolean;
}) {
  const src = compact
    ? inverse
      ? "/brand/monogram-inverse-transparent.png"
      : "/brand/monogram-transparent.png"
    : inverse
      ? "/brand/wordmark-inverse-transparent.png"
      : "/brand/wordmark-transparent.png";
  return (
    <Link
      href="/"
      className="li-logo"
      aria-label="Lizárraga & Ibarra Abogados · Inicio"
    >
      <Image
        src={src}
        width={compact ? 848 : 1854}
        height={compact ? 752 : 330}
        alt="Lizárraga & Ibarra Abogados"
        priority
      />
    </Link>
  );
}
