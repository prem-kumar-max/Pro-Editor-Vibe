// File acceptance, validation and metadata helpers.

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

// Every format we accept at the UI/validation level.
export const ACCEPTED_FORMATS = [
  { ext: "jpg", mime: "image/jpeg", label: "JPG" },
  { ext: "jpeg", mime: "image/jpeg", label: "JPEG" },
  { ext: "png", mime: "image/png", label: "PNG" },
  { ext: "webp", mime: "image/webp", label: "WEBP" },
  { ext: "gif", mime: "image/gif", label: "GIF" },
  { ext: "svg", mime: "image/svg+xml", label: "SVG" },
  { ext: "heic", mime: "image/heic", label: "HEIC" },
  { ext: "avif", mime: "image/avif", label: "AVIF" },
  { ext: "bmp", mime: "image/bmp", label: "BMP" },
  { ext: "tiff", mime: "image/tiff", label: "TIFF" },
  { ext: "tif", mime: "image/tiff", label: "TIFF" },
  { ext: "ico", mime: "image/x-icon", label: "ICO" },
  { ext: "psd", mime: "image/vnd.adobe.photoshop", label: "PSD" },
]

export const ACCEPTED_EXTENSIONS = ACCEPTED_FORMATS.map((f) => f.ext)

// String for the <input accept="..."> attribute.
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",")

export function getExtension(name = "") {
  const parts = name.split(".")
  return parts.length > 1 ? parts.pop().toLowerCase() : ""
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ""
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

// Build the normalized metadata object we keep in state for the whole flow.
export function describeFile(file) {
  const extension = getExtension(file.name)
  const match = ACCEPTED_FORMATS.find((f) => f.ext === extension)
  return {
    file,
    name: file.name,
    size: file.size,
    type: file.type || match?.mime || "",
    extension,
    label: match?.label || extension.toUpperCase(),
  }
}

// Returns { valid, error }. Extension is authoritative because some formats
// (heic, psd, avif...) report empty or inconsistent MIME types across browsers.
export function validateFile(file) {
  const extension = getExtension(file.name)
  const supported = ACCEPTED_EXTENSIONS.includes(extension)

  if (!supported) {
    return { valid: false, error: "Unsupported image format." }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds the maximum allowed limit." }
  }
  return { valid: true, error: null }
}

// Some formats cannot be rendered by the browser's <img> tag for a live preview.
// We still accept them, but preview differently.
const PREVIEWABLE = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "avif", "ico"]

export function isBrowserPreviewable(extension) {
  return PREVIEWABLE.includes(extension)
}

// filename.png -> filename-edited.png (preserves original extension by default)
export function buildOutputName(originalName, suffix = "edited", overrideExt) {
  const dot = originalName.lastIndexOf(".")
  const base = dot > 0 ? originalName.slice(0, dot) : originalName
  const ext = overrideExt || (dot > 0 ? originalName.slice(dot + 1) : "png")
  return `${base}-${suffix}.${ext}`
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
