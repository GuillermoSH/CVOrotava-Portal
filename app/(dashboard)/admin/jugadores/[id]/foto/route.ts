import { NextResponse } from "next/server";
import sharp from "sharp";

import { requireRosterWriteAccess } from "@/lib/roster/auth";
import {
  avatarObjectPath,
  PLAYER_PHOTOS_BUCKET,
  playerPhotoDownloadFilename,
} from "@/lib/roster/player-photo";
import { getRosterDb } from "@/lib/roster/repository/client";
import { getPlayerById } from "@/lib/roster/repository/players";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireRosterWriteAccess();

  const { id } = await context.params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  if (!UUID_RE.test(id)) {
    return new NextResponse("Foto no encontrada", { status: 404 });
  }

  // Vista previa: el avatar vive siempre en `<id>/avatar.webp`, así que no hace falta leer
  // la ficha (la descarga sí la necesita para el nombre del archivo).
  const player = inline ? null : await getPlayerById(await getRosterDb(), id);
  if (!inline && !player?.photo_path) {
    return new NextResponse("Foto no encontrada", { status: 404 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .download(inline ? avatarObjectPath(id) : (player?.photo_path as string));

  if (error || !data) {
    return new NextResponse("Foto no encontrada", { status: 404 });
  }

  const source = Buffer.from(await data.arrayBuffer());

  // Preview inline: WebP ligero con cache privada corta. Descarga: PNG (federación).
  if (inline) {
    return new NextResponse(source, {
      status: 200,
      headers: {
        "Content-Type": data.type || "image/webp",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "Content-Length": String(source.byteLength),
      },
    });
  }

  if (!player) return new NextResponse("Foto no encontrada", { status: 404 });

  let png: Buffer;
  try {
    png = await sharp(source).png().toBuffer();
  } catch {
    return new NextResponse("No se pudo convertir la foto", { status: 500 });
  }

  const filename = playerPhotoDownloadFilename(player);
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(png.byteLength),
    },
  });
}
