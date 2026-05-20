/**
 * Client-side image preprocessing for OCR.
 * Downscales to max edge `maxEdge` (1600 default), converts to grayscale,
 * boosts contrast. Returns a data URL that tesseract.js can consume directly.
 *
 * Runs in the browser only — never imported server-side.
 */

const MAX_EDGE_DEFAULT = 1600;

export async function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("failed to load image"));
      img.src = url;
    });
  } finally {
    if (typeof source !== "string") {
      // Revoke after load so we don't leak; tesseract is given the canvas, not the URL.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}

/**
 * Compress a photo into a small JPEG data URL for upload as debug data.
 * Independent of preprocessForOcr — we want to keep the original (color)
 * image for human review, not the grayscale + contrast-stretched version.
 */
export async function compressImageToDataUrl(
  source: File | Blob,
  maxEdge = 1200,
  quality = 0.55,
): Promise<string> {
  const img = await loadImage(source);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const scale = Math.min(1, maxEdge / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function preprocessForOcr(
  img: HTMLImageElement,
  maxEdge = MAX_EDGE_DEFAULT,
): HTMLCanvasElement {
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;
  const scale = Math.min(1, maxEdge / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");

  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Grayscale + simple contrast stretch.
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray =
      (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const span = Math.max(1, max - min);
  if (span < 220) {
    // Only stretch when image is low-contrast; avoid blowing out crisp photos.
    for (let i = 0; i < data.length; i += 4) {
      const v = ((data[i] - min) / span) * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
