// Browser-side image helpers used by the mock processing pipeline.
// These are honest, small canvas operations — NOT AI. They exist so the demo
// flow produces a real, downloadable file without pretending to do AI work.

// Load a File into an HTMLImageElement. Rejects for formats the browser
// cannot decode (heic, psd, tiff on most browsers).
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      resolve({ img, url, width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Browser cannot decode this format for preview."))
    }
    img.src = url
  })
}

// Read the intrinsic dimensions of an image file, if the browser can decode it.
export async function readDimensions(file) {
  try {
    const { img, url } = await loadImageFromFile(file)
    const dims = { width: img.naturalWidth, height: img.naturalHeight }
    URL.revokeObjectURL(url)
    return dims
  } catch {
    return null
  }
}

// Map an extension to a canvas-encodable MIME type. Canvas can only encode a
// subset; anything else falls back to PNG (and callers must flag the change).
const CANVAS_ENCODE = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

export function canCanvasEncode(extension) {
  return Boolean(CANVAS_ENCODE[extension])
}

export function canvasMimeFor(extension) {
  return CANVAS_ENCODE[extension] || "image/png"
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
      mime,
      quality,
    )
  })
}

// Upscale by drawing the source at a larger size with smoothing. Real upscaling
// needs an AI super-resolution model; this is a clearly-labelled demo resample.
export async function demoUpscale(file, scale, extension) {
  const { img, url, width, height } = await loadImageFromFile(file)
  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext("2d")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)

  const canEncode = canCanvasEncode(extension)
  const mime = canvasMimeFor(extension)
  // JPEG has no alpha; keep quality high.
  const blob = await canvasToBlob(canvas, mime, mime === "image/jpeg" ? 0.92 : undefined)

  return {
    blob,
    mime,
    formatChanged: !canEncode,
    outputExtension: canEncode ? extension : "png",
    original: { width, height },
    result: { width: canvas.width, height: canvas.height },
  }
}

// Demo background removal: knock out pixels close to the dominant border color
// so we return a genuine transparent PNG. This is a heuristic, not a segmentation
// model — the UI must communicate that clearly.
export async function demoRemoveBackground(file, settings = {}) {
  const { img, url, width, height } = await loadImageFromFile(file)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)

  const image = ctx.getImageData(0, 0, width, height)
  const d = image.data

  // Estimate background color from the four corners.
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ]
  let br = 0
  let bg = 0
  let bb = 0
  corners.forEach((i) => {
    br += d[i]
    bg += d[i + 1]
    bb += d[i + 2]
  })
  br /= 4
  bg /= 4
  bb /= 4

  const tolerance = 70
  const greenStrength = settings.greenSpill?.enabled ? settings.greenSpill.strength / 100 : 0
  const blueStrength = settings.blueSpill?.enabled ? settings.blueSpill.strength / 100 : 0

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    const dist = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2)
    if (dist < tolerance) {
      d[i + 3] = 0 // transparent
      continue
    }
    // Spill suppression: pull down excess green/blue channel around edges.
    if (greenStrength && g > r && g > b) {
      d[i + 1] = g - (g - Math.max(r, b)) * greenStrength
    }
    if (blueStrength && b > r && b > g) {
      d[i + 2] = b - (b - Math.max(r, g)) * blueStrength
    }
  }
  ctx.putImageData(image, 0, 0)

  const blob = await canvasToBlob(canvas, "image/png")
  return {
    blob,
    mime: "image/png",
    // Background removal must be PNG to keep transparency.
    formatChanged: true,
    outputExtension: "png",
    original: { width, height },
    result: { width, height },
  }
}

