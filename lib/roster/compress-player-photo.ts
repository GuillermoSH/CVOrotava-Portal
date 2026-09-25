/** Compresión de foto de ficha en el navegador (recorte 1:1 + WebP). */

const OUTPUT_SIDE = 800;
const MAX_BYTES = 100 * 1024;
const QUALITIES = [0.75, 0.65, 0.55] as const;

export type PixelCrop = {
  /** Origen X en píxeles naturales de la imagen. */
  x: number;
  /** Origen Y en píxeles naturales de la imagen. */
  y: number;
  /** Lado del cuadrado en píxeles naturales. */
  size: number;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const quality of QUALITIES) {
    const webp = await canvasToBlob(canvas, "image/webp", quality);
    if (webp && webp.size > 0 && webp.type === "image/webp") {
      if (webp.size <= MAX_BYTES || quality === QUALITIES[QUALITIES.length - 1]) {
        return webp;
      }
      continue;
    }
  }

  for (const quality of QUALITIES) {
    const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
    if (jpeg && jpeg.size > 0) {
      if (jpeg.size <= MAX_BYTES || quality === QUALITIES[QUALITIES.length - 1]) {
        return jpeg;
      }
    }
  }

  throw new Error("No se pudo comprimir la imagen");
}

/**
 * Recorta un cuadrado 1:1 de la imagen y exporta WebP (~800×800, techo ~100 KB).
 * EXIF se pierde al pintar en canvas.
 */
export async function compressSquarePlayerPhoto(
  image: CanvasImageSource & { width: number; height: number },
  crop: PixelCrop,
): Promise<Blob> {
  const naturalW =
    "naturalWidth" in image && typeof image.naturalWidth === "number"
      ? image.naturalWidth
      : image.width;
  const naturalH =
    "naturalHeight" in image && typeof image.naturalHeight === "number"
      ? image.naturalHeight
      : image.height;

  if (!naturalW || !naturalH) throw new Error("Imagen inválida");

  const size = Math.max(1, Math.min(crop.size, naturalW, naturalH));
  const sx = Math.max(0, Math.min(crop.x, naturalW - size));
  const sy = Math.max(0, Math.min(crop.y, naturalH - size));

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIDE;
  canvas.height = OUTPUT_SIDE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el canvas");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, size, size, 0, 0, OUTPUT_SIDE, OUTPUT_SIDE);

  return encodeCanvas(canvas);
}

export type LoadedPlayerImage = {
  image: HTMLImageElement;
  objectUrl: string;
};

/** Carga la imagen; el caller debe liberar `objectUrl` con URL.revokeObjectURL. */
export function loadImageElement(file: File): Promise<LoadedPlayerImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") && file.type !== "") {
      reject(new Error("El archivo no es una imagen"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ image: img, objectUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = objectUrl;
  });
}
