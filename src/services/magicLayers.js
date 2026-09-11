const DINO_URL = import.meta.env?.VITE_GROUNDING_DINO_MODEL_URL
const SAM2_URL = import.meta.env?.VITE_SAM2_MODEL_URL
const OCR_URL = import.meta.env?.VITE_OCR_MODEL_URL
const SEGMENT_ALL_URL = import.meta.env?.VITE_SEGMENT_ALL_MODEL_URL
const MAX_AUTO_LAYERS = 100

const hasUrl = (value) => typeof value === "string" && value.trim().length > 0

function imageForm(file, fields = {}) {
  const form = new FormData()
  form.append("image", file, file.name || "image")
  Object.entries(fields).forEach(([key, value]) => form.append(key, typeof value === "string" ? value : JSON.stringify(value)))
  return form
}

async function readJson(response, serviceName) {
  if (!response.ok) throw new Error(`${serviceName} returned HTTP ${response.status}`)
  return response.json()
}

export async function groundingDino(file) {
  if (!hasUrl(DINO_URL)) return null
  const response = await fetch(DINO_URL, { method: "POST", body: imageForm(file, { prompt: "person. face. hair. skin. shirt. jacket. pants. dress. shoes. bag. hat. glasses. animal. bird. dog. cat. vehicle. car. bus. bicycle. motorcycle. building. wall. window. door. furniture. table. chair. plant. tree. flower. food. book. phone. computer. sign. logo. sky. cloud. water. ground. road. foreground object." }) })
  return readJson(response, "Grounding DINO")
}

export async function sam2Segment(file, box) {
  if (!hasUrl(SAM2_URL)) return null
  const response = await fetch(SAM2_URL, { method: "POST", body: imageForm(file, { box }) })
  return readJson(response, "SAM2")
}

export async function ocrDetect(file) {
  if (!hasUrl(OCR_URL)) return null
  const response = await fetch(OCR_URL, { method: "POST", body: imageForm(file) })
  return readJson(response, "OCR")
}

export async function segmentAllRegions(file) {
  if (!hasUrl(SEGMENT_ALL_URL)) return null
  const response = await fetch(SEGMENT_ALL_URL, {
    method: "POST",
    body: imageForm(file, { pointsPerBatch: 128, maxMasks: MAX_AUTO_LAYERS }),
  })
  return readJson(response, "Segment-all")
}

function firstArray(value, keys) {
  if (Array.isArray(value)) return value
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key]
  return []
}

function normalizeBox(box) {
  if (Array.isArray(box) && box.length >= 4) return box.slice(0, 4).map(Number)
  if (!box || typeof box !== "object") return null
  if (Array.isArray(box.xyxy)) return normalizeBox(box.xyxy)
  const x = Number(box.x ?? box.xmin ?? box.left ?? 0)
  const y = Number(box.y ?? box.ymin ?? box.top ?? 0)
  const width = Number(box.width ?? (box.xmax != null ? Number(box.xmax) - x : 0))
  const height = Number(box.height ?? (box.ymax != null ? Number(box.ymax) - y : 0))
  return [x, y, width, height]
}

function normalizeRegions(payload, keys, defaultLabel) {
  return firstArray(payload, keys).map((item) => {
    const box = normalizeBox(item.box || item.bbox || item.boundingBox || item)
    return box && box[2] > 0 && box[3] > 0
      ? { box, label: String(item.label || item.class || item.name || defaultLabel), score: Number(item.score ?? item.confidence ?? 1) }
      : null
  }).filter(Boolean)
}

function canvasFromSource(source, width, height) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  canvas.getContext("2d").drawImage(source, 0, 0, width, height)
  return canvas
}

function polygonMask(maskCanvas, polygon) {
  const context = maskCanvas.getContext("2d")
  context.beginPath()
  polygon.forEach((point, index) => {
    const x = Array.isArray(point) ? point[0] : point.x
    const y = Array.isArray(point) ? point[1] : point.y
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.closePath()
  context.fill()
}

async function maskCanvasFromResponse(payload, width, height, box) {
  const source = payload?.mask || payload?.segmentation || payload?.data || payload
  if (Array.isArray(source) && Array.isArray(source[0])) {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    if (Array.isArray(source[0][0])) source.forEach((polygon) => polygonMask(canvas, polygon))
    else polygonMask(canvas, source)
    return canvas
  }
  if (typeof source === "string") {
    const image = new Image()
    image.src = source.startsWith("data:") ? source : `data:image/png;base64,${source}`
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
    return canvasFromSource(image, width, height)
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  context.fillStyle = "#fff"
  context.fillRect(box[0], box[1], box[2], box[3])
  return canvas
}

function maskedPng(sourceCanvas, maskCanvas, width, height, keepMask = true) {
  const source = sourceCanvas.getContext("2d").getImageData(0, 0, width, height)
  const mask = maskCanvas.getContext("2d").getImageData(0, 0, width, height)
  for (let index = 0; index < source.data.length; index += 4) {
    if ((keepMask ? mask.data[index + 3] : 255 - mask.data[index + 3]) === 0) source.data[index + 3] = 0
  }
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  canvas.getContext("2d").putImageData(source, 0, 0)
  return canvas.toDataURL("image/png")
}

function boundsFromMask(maskCanvas, width, height) {
  const data = maskCanvas.getContext("2d").getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] < 16) continue
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  return maxX < 0 ? { x: 0, y: 0, width, height } : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function fullCanvasLayer(id, name, pngDataUrl, width, height, zIndex, confidence = 1, bounds = { x: 0, y: 0, width, height }) {
  return { id, name, layerName: name, type: "raster", renderType: "raster", imageUrl: pngDataUrl, thumbnail: pngDataUrl, thumbnailDataUrl: pngDataUrl, pngDataUrl, x: 0, y: 0, width, height, sourceWidth: width, sourceHeight: height, bounds, visible: true, opacity: 1, locked: name === "Background", zIndex, confidence, transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } }
}

function fallbackLayers(sourceCanvas, width, height) {
  return [fullCanvasLayer("full-image", "Full Image", sourceCanvas.toDataURL("image/png"), width, height, 0)]
}

export function hasFullCanvasGeometry(layers, width, height) {
  return layers.every((layer) => layer.x === 0 && layer.y === 0 && layer.width === width && layer.height === height)
}

export async function extractLayers(imageFile, onStage) {
  const image = new Image()
  const url = URL.createObjectURL(imageFile)
  image.src = url
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
  const width = image.naturalWidth
  const height = image.naturalHeight
  const sourceCanvas = canvasFromSource(image, width, height)
  URL.revokeObjectURL(url)
  if (hasUrl(SEGMENT_ALL_URL)) try {
    onStage?.("Finding regions")
    const regions = normalizeMaskRegions(await segmentAllRegions(imageFile))
    if (!regions.length) throw new Error("Segment-all returned no regions")
    onStage?.("Separating elements")
    regions.sort((first, second) => second.area - first.area)
    const claimed = document.createElement("canvas")
    claimed.width = width
    claimed.height = height
    const claimedContext = claimed.getContext("2d")
    const layers = []
    const markClaimed = (maskCanvas) => {
      const maskPixels = maskCanvas.getContext("2d").getImageData(0, 0, width, height)
      const claimedPixels = claimedContext.getImageData(0, 0, width, height)
      for (let index = 3; index < claimedPixels.data.length; index += 4) if (maskPixels.data[index]) claimedPixels.data[index] = 255
      claimedContext.putImageData(claimedPixels, 0, 0)
    }
    for (const region of regions.slice(0, MAX_AUTO_LAYERS)) {
      const maskCanvas = await maskCanvasFromResponse({ mask: region.mask }, width, height, region.box)
      markClaimed(maskCanvas)
      layers.push(fullCanvasLayer(`layer-${layers.length + 1}`, `Element ${layers.length + 1}`, maskedPng(sourceCanvas, maskCanvas, width, height), width, height, layers.length + 1, region.score, boundsFromMask(maskCanvas, width, height)))
    }
    if (!layers.length) throw new Error("No usable automatic regions")
    onStage?.("Creating layers")
    layers.unshift(fullCanvasLayer("background", "Background", maskedPng(sourceCanvas, claimed, width, height, false), width, height, 0))
    return layers
  } catch (error) {
    console.warn("Segment-everything failed; trying Grounding DINO + box-SAM.", error)
  }
  const hasBackend = hasUrl(DINO_URL) && hasUrl(SAM2_URL)
  if (hasBackend) try {
    onStage?.("Detecting objects")
    const detections = normalizeRegions(await groundingDino(imageFile), ["detections", "objects", "predictions", "results"], "Object")
    onStage?.("Separating elements")
    let text = []
    if (hasUrl(OCR_URL)) {
      try {
        text = normalizeRegions(await ocrDetect(imageFile), ["regions", "textRegions", "detections", "results"], "Text")
      } catch (error) {
        console.warn("Magic Layers OCR failed; continuing without text layers.", error)
      }
    }
    const claimed = document.createElement("canvas")
    claimed.width = width
    claimed.height = height
    const claimedContext = claimed.getContext("2d")
    const layers = []
    const names = new Map()
    for (const detection of [...detections, ...text]) {
      const maskCanvas = await maskCanvasFromResponse(await sam2Segment(imageFile, detection.box), width, height, detection.box)
      const maskPixels = maskCanvas.getContext("2d").getImageData(0, 0, width, height)
      const claimedPixels = claimedContext.getImageData(0, 0, width, height)
      for (let index = 3; index < claimedPixels.data.length; index += 4) if (maskPixels.data[index]) claimedPixels.data[index] = 255
      claimedContext.putImageData(claimedPixels, 0, 0)
      const baseName = detection.label.toLowerCase() === "foreground object" ? "Object" : detection.label
      const count = (names.get(baseName) || 0) + 1
      names.set(baseName, count)
      const name = count === 1 ? baseName : `${baseName} ${count}`
      layers.push(fullCanvasLayer(`layer-${layers.length + 1}`, name, maskedPng(sourceCanvas, maskCanvas, width, height), width, height, layers.length + 1, detection.score, boundsFromMask(maskCanvas, width, height)))
    }
    onStage?.("Creating layers")
    if (!layers.length) throw new Error("The backend returned no detectable regions")
    layers.unshift(fullCanvasLayer("background", "Background", maskedPng(sourceCanvas, claimed, width, height, false), width, height, 0))
    return layers
  } catch (error) {
    console.warn("Magic Layers backend failed; trying browser segmentation.", error)
  }
  try {
    onStage?.("Separating elements")
    const { segmentAllLayers } = await import("./browserSegmentation.js")
    const segmentedLayers = await segmentAllLayers(image)
    if (segmentedLayers.length) {
      onStage?.("Creating layers")
      const covered = document.createElement("canvas")
      covered.width = width
      covered.height = height
      const coveredContext = covered.getContext("2d")
      for (const layer of segmentedLayers) {
        const image = new Image()
        image.src = layer.layerUrl
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
        coveredContext.drawImage(image, 0, 0)
      }
      const background = fullCanvasLayer("background", "Background", maskedPng(sourceCanvas, covered, width, height, false), width, height, 0)
      const elementLayers = segmentedLayers.map((layer, index) => fullCanvasLayer(`layer-${index + 1}`, layer.label, layer.layerUrl, width, height, index + 1, layer.score, layer.bounds))
      return [background, ...elementLayers]
    }
  } catch (error) {
    console.warn("Browser segmentation failed; using full-image fallback.", error)
  }
  return fallbackLayers(sourceCanvas, width, height)
}

function normalizeMaskRegions(payload) {
  return firstArray(payload, ["masks", "regions", "results"]).map((item) => {
    const box = normalizeBox(item.box || item.bbox || item.boundingBox)
    if (!box || box[2] <= 0 || box[3] <= 0) return null
    return { box, mask: item.mask || item.segmentation || item.data, score: Number(item.score ?? item.confidence ?? 1), area: Number(item.area ?? box[2] * box[3]) }
  }).filter(Boolean)
}