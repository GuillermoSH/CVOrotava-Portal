/** Tile de fondo del logo — siempre oscuro, independiente del tema de la página. */
export const CLUB_LOGO_TILE_BG = "#141418";

const LOGO_SIZES = [32, 64, 128, 192, 256, 512] as const;

/** Elige el asset @2x más pequeño que cubra `displayPx`. */
export function clubLogoSrc(displayPx: number): string {
  const need = Math.ceil(displayPx * 2);
  const size = LOGO_SIZES.find((s) => s >= need) ?? LOGO_SIZES[LOGO_SIZES.length - 1];
  return `/logo/logo_blanco_${size}.webp`;
}
