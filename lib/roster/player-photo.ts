/** Constantes y helpers de foto de ficha (admin). Seguro en cliente y servidor. */

export const PLAYER_PHOTOS_BUCKET = "player-photos";

/** Path fijo en Storage: sin temporada. */
export function avatarObjectPath(playerId: string): string {
  return `${playerId}/avatar.webp`;
}

/** Nombre de descarga: Apellido_Nombre.png (al exportar desde la ficha). */
export function playerPhotoDownloadFilename(player: {
  first_name: string;
  last_name: string;
}): string {
  const sanitize = (value: string) =>
    value
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_-]/gu, "")
      .slice(0, 80) || "jugador";
  return `${sanitize(player.last_name)}_${sanitize(player.first_name)}.png`;
}

export function playerPhotoRoute(playerId: string, opts?: { inline?: boolean }): string {
  const base = `/admin/jugadores/${playerId}/foto`;
  return opts?.inline ? `${base}?inline=1` : base;
}
