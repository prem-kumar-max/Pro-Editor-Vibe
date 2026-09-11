import { extractLayers } from "./magicLayers.js"
import { loadImageFromFile } from "../utils/imageUtils.js"

export async function createMagicLayers(file, settings = {}, onProgress) {
  const options = { ...settings }
  onProgress?.({ percent: 8, label: "Preparing image" })
  const { url, width, height } = await loadImageFromFile(file)
  URL.revokeObjectURL(url)
  onProgress?.({ percent: 20, label: "Analyzing image" })
  const layers = await extractLayers(file, (stage) => {
    const progress = { "Detecting objects": 40, "Separating elements": 62, "Creating layers": 82 }[stage] || 20
    onProgress?.({ percent: progress, label: stage })
  })
  onProgress?.({ percent: 94, label: "Preparing editable result" })
  onProgress?.({ percent: 100, label: "Magic Layers ready" })
  return {
    layers: layers.map((layer, index) => ({ ...layer, zIndex: index })),
    width, height, sourceWidth: width, sourceHeight: height,
    viewBox: `0 0 ${width} ${height}`, settings: options,
    layersAreSemantic: layers.some((layer) => layer.name !== "Full Image"),
    capabilities: { objectDetection: "grounding-dino", semanticSegmentation: "sam2", ocr: "ocr" },
    notice: layers.length === 1 ? "Model endpoints were unavailable or failed, so the original image was kept as one aligned layer." : "Semantic layers preserve the original pixels in a shared full-canvas coordinate space.",
  }
}