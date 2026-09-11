import JSZip from "jszip"
import { downloadBlob } from "../utils/fileUtils.js"
import { layerToSvg } from "../utils/svgParser.js"

export function exportProjectJson(layers, result, filename = "magic-layers-project.json") {
  const project = {
    format: "krp-magic-layers",
    version: 1,
    width: result.width,
    height: result.height,
    viewBox: result.viewBox,
    layers,
  }
  downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), filename)
}

export async function exportProjectZip(layers, result, svg, filename = "magic-layers-project.zip") {
  const zip = new JSZip()
  zip.file("project.json", JSON.stringify({ format: "krp-magic-layers", version: 1, width: result.width, height: result.height, viewBox: result.viewBox, layers }, null, 2))
  zip.file("magic-layers.svg", svg)
  layers.forEach((layer, index) => {
    const layerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${result.width}" height="${result.height}" viewBox="${result.viewBox}">${layerToSvg(layer)}</svg>`
    zip.file(`layers/layer-${String(index + 1).padStart(3, "0")}-${safeName(layer.name)}.svg`, layerSvg)
  })
  const blob = await zip.generateAsync({ type: "blob" })
  downloadBlob(blob, filename)
}

function safeName(name = "layer") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "layer"
}