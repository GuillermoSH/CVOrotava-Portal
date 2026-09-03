import Image from "next/image";

import { CLUB_LOGO_TILE_BG, clubLogoSrc } from "@/lib/brand/logo";
import { cn } from "@/lib/utils";

/** Presets de tamaño (como Team Manager `ClubLogo`). */
export const logoSizeClass = {
  nav: "size-7 sm:size-8",
  header: "size-9 sm:size-10",
  splash: "size-16 sm:size-20",
} as const;

export type LogoSizePreset = keyof typeof logoSizeClass;

/** Marca del club. El tamaño de caja lo fija `className` o `preset`; `px` elige el asset @2x. */
export function Logo({
  className,
  preset,
  px = 40,
  priority = false,
}: {
  className?: string;
  preset?: LogoSizePreset;
  px?: number;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-white/12 shadow-[0_1px_0_rgba(255,255,255,0.06)]",
        preset ? logoSizeClass[preset] : null,
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
