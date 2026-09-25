import { NextResponse } from "next/server";
import sharp from "sharp";

import { requireRosterWriteAccess } from "@/lib/roster/auth";
import {
  PLAYER_PHOTOS_BUCKET,
  playerPhotoDownloadFilename,
} from "@/lib/roster/player-photo";
import { getRosterDb } from "@/lib/roster/repository/client";
import { getPlayerById } from "@/lib/roster/repository/players";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireRosterWriteAccess();

  const { id } = await context.params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  const db = await getRosterDb();
  const player = await getPlayerById(db, id);
  if (!player?.photo_path) {
    return new NextResponse("Foto no encontrada", { status: 404 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .download(player.photo_path);

  if (error || !data) {
    return new NextResponse("Foto no encontrada", { status: 404 });
  }

  const source = Buffer.from(await data.arrayBuffer());

  // Preview inline: WebP ligero. Descarga: PNG (federación / usos que no abren WebP).
  if (inline) {
    return new NextResponse(source, {
      status: 200,
      headers: {
        "Content-Type": data.type || "image/webp",
        "Content-Disposition": `inline; filename="${playerPhotoDownloadFilename(player).replace(/\.png$/i, ".webp")}"`,
        "Cache-Control": "private, no-store",
        "Content-Length": String(source.byteLength),
      },
    });
  }

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
