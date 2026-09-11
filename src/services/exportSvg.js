import { layersToSvg } from "../utils/svgParser.js"
import { downloadBlob } from "../utils/fileUtils.js"

export function exportSvg(layers, width, height, viewBox, filename = "magic-layers.svg") {
  const svg = layersToSvg(layers, width, height, viewBox)
  const blob = new Blob([svg], { type: "image/svg+xml" })
  downloadBlob(blob, filename)
  return svg
}
