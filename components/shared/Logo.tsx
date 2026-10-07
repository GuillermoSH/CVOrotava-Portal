import Image from "next/image";

import { CLUB_NAME } from "@/lib/brand/club";
import { clubLogoSrc, type ClubLogoVariant } from "@/lib/brand/logo";
import { cn } from "@/lib/utils";

/** Presets de tamaño (como Team Manager `ClubLogo`). */
export const logoSizeClass = {
  nav: "size-7 sm:size-8",
  header: "size-9 sm:size-10",
  splash: "size-16 sm:size-20",
} as const;

export type LogoSizePreset = keyof typeof logoSizeClass;

function LogoImage({
  variant,
  px,
  priority,
  alt,
}: {
  variant: ClubLogoVariant;
  px: number;
  priority: boolean;
  alt: string;
}) {
  return (
    <Image
      src={clubLogoSrc(px, variant)}
      alt={alt}
      fill
      sizes={`${px}px`}
      className="object-contain"
      priority={priority}
    />
  );
}

/**
 * Marca del club sin tile. Claro/oscuro vía CSS (`html.dark`) en wrappers
 * (no en el `Image`: el estilo inline de Next pisa `hidden`).
 */
export function Logo({
  className,
  preset,
  px = 40,
  priority = false,
  variant,
}: {
  className?: string;
  preset?: LogoSizePreset;
  px?: number;
  priority?: boolean;
  /** Fuerza una sola variante; por defecto ambas y CSS elige según tema. */
  variant?: ClubLogoVariant;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0",
        preset ? logoSizeClass[preset] : null,
        className,
      )}
    >
      {variant ? (
        <LogoImage variant={variant} px={px} priority={priority} alt={CLUB_NAME} />
      ) : (
        <>
          <div className="absolute inset-0 dark:hidden">
            <LogoImage variant="claro" px={px} priority={priority} alt={CLUB_NAME} />
          </div>
          <div className="absolute inset-0 hidden dark:block" aria-hidden>
            <LogoImage variant="blanco" px={px} priority={priority} alt="" />
          </div>
        </>
      )}
    </div>
  );
}
