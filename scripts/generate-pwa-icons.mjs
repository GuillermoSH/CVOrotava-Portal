// Genera los iconos PWA (PNG) a partir del logo blanco del club sobre el fondo oscuro de la marca.
// Uso: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";

const BG = "#0d0d0f"; // --club-bg oscuro
const SRC = "public/logo/logo_blanco_512.webp";

async function icon(size, logoRatio, out) {
  const logo = await sharp(SRC)
    .resize(Math.round(size * logoRatio), Math.round(size * logoRatio), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("ok", out);
}

await icon(192, 0.86, "public/icons/icon-192.png");
await icon(512, 0.86, "public/icons/icon-512.png");
// Maskable: el logo dentro de la zona segura (80 % central)
await icon(512, 0.62, "public/icons/icon-maskable-512.png");
// iOS (apple-touch-icon)
await icon(180, 0.86, "public/icons/apple-touch-icon.png");
