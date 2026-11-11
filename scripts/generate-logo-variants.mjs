// Genera las variantes del logo en blanco total (monocromo) a partir del original de mayor
// resolución del proyecto (brand/logos/logo_fondo_oscuro.png, 876×1051 con transparencia).
// Todo píxel visible pasa a blanco y se conserva el canal alfa: los huecos siguen siendo huecos.
// Sirve para colocar el logo sobre cualquier color de marca (franjas azul, ámbar o roja de los
// correos, fondos de color…) sin que destaque con sus colores propios.
//
// Uso: node scripts/generate-logo-variants.mjs
//
// Salida (public/logo/):
//   logo_monoblanco_master.png          original 876×1051, sin pérdida de calidad (el de mayor escala)
//   logo_monoblanco_{32…1024}.png       cuadrados con fondo transparente, como la serie logo_blanco_*
//   email-logo-white.png                168×168, el que usan los correos de aviso (se muestra a 56 px)
import sharp from "sharp";

const SOURCE = "brand/logos/logo_fondo_oscuro.png";
const OUT = "public/logo";
const SQUARE_SIZES = [32, 64, 128, 192, 256, 512, 1024];
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function whiteMaster() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
  return sharp(data, { raw: info });
}

async function square(size, file) {
  const master = await whiteMaster();
  await master
    .resize(size, size, { fit: "contain", background: TRANSPARENT, kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${file}`);
  console.log("ok", file, `${size}×${size}`);
}

const master = await whiteMaster();
await master.png({ compressionLevel: 9 }).toFile(`${OUT}/logo_monoblanco_master.png`);
console.log("ok logo_monoblanco_master.png (original)");

for (const size of SQUARE_SIZES) await square(size, `logo_monoblanco_${size}.png`);
await square(168, "email-logo-white.png");
