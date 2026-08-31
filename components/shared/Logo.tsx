import Image from "next/image";

import { CLUB_LOGO_TILE_BG, clubLogoSrc } from "@/lib/brand/logo";
import { cn } from "@/lib/utils";

/** Marca del club. El tamaño de caja lo fija `className` (p. ej. `size-9`); `px` solo elige el asset @2x. */
export function Logo({
  className,
  px = 40,
  priority = false,
}: {
  className?: string;
  px?: number;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-white/12 shadow-[0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
      style={{ backgroundColor: CLUB_LOGO_TILE_BG }}
    >
      <Image
        src={clubLogoSrc(px)}
        alt="Club Voleibol Orotava"
        fill
        sizes={`${px}px`}
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
