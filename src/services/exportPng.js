import { layersToSvg } from "../utils/svgParser.js"
import { downloadBlob } from "../utils/fileUtils.js"

export async function exportPng(
  layers,
  width,
  height,
  viewBox,
  scale = 1,
  background = "transparent",
  filename = "magic-layers.png",
  format = "image/png",
) {
  const svg = layersToSvg(layers, width, height, viewBox)
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  try {
    const image = new Image()
    image.src = svgUrl
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error("Could not rasterize the SVG export."))
    })
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext("2d")
    if (background !== "transparent") {
      context.fillStyle = background || "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Image export failed."))), format, format === "image/jpeg" ? 0.92 : undefined),
    )
    downloadBlob(blob, filename)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
