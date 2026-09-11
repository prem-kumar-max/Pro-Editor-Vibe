const SUPPORTED_ELEMENTS = ["path", "polygon", "polyline", "rect", "circle", "ellipse"]

function colorFromElement(element) {
  return element.getAttribute("fill") || element.style.fill || "#000000"
}

function attributesFromElement(element) {
  const attributes = {}
  for (const attribute of element.attributes) attributes[attribute.name] = attribute.value
  return attributes
}

function elementSize(element) {
  const data = element.getAttribute("d") || element.getAttribute("points") || ""
  return data.length
}

function structuralName(element, index) {
  const tag = element.tagName
  if (tag === "circle" || tag === "ellipse") return "Circle"
  if (tag === "rect") return "Rectangle"
  if (tag === "polygon") {
    const pointCount = (element.getAttribute("points") || "").trim().split(/\s+/).length
    return pointCount >= 8 ? "Star Shape" : "Polygon Shape"
  }
  const pathLength = elementSize(element)
  if (pathLength > 700) return "Text-like Element"
  if (pathLength > 180) return "Decorative Shape"
  if (pathLength > 40) return "Compound Shape"
  return `Small Detail ${index + 1}`
}

function elementBounds(element, width, height) {
  const tag = element.tagName
  if (tag === "circle") {
    const cx = Number(element.getAttribute("cx") || 0)
    const cy = Number(element.getAttribute("cy") || 0)
    const radius = Number(element.getAttribute("r") || 0)
    return { x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 }
  }
  if (tag === "ellipse") {
    const cx = Number(element.getAttribute("cx") || 0)
    const cy = Number(element.getAttribute("cy") || 0)
    const rx = Number(element.getAttribute("rx") || 0)
    const ry = Number(element.getAttribute("ry") || 0)
    return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 }
  }
  if (tag === "rect") return { x: Number(element.getAttribute("x") || 0), y: Number(element.getAttribute("y") || 0), width: Number(element.getAttribute("width") || width), height: Number(element.getAttribute("height") || height) }
  const values = (element.getAttribute("d") || element.getAttribute("points") || "").match(/-?\d*\.?\d+/g)?.map(Number) || []
  const points = []
  for (let index = 0; index < values.length - 1; index += 2) points.push([values[index], values[index + 1]])
  if (!points.length) return { x: 0, y: 0, width, height }
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { x: minX, y: minY, width: Math.max(1, Math.max(...xs) - minX), height: Math.max(1, Math.max(...ys) - minY) }
}

export function parseSvgLayers(svgString) {
  const document = new DOMParser().parseFromString(svgString, "image/svg+xml")
  if (document.querySelector("parsererror")) throw new Error("Generated SVG could not be parsed.")

  const root = document.documentElement
  const viewBox = root.getAttribute("viewBox") || `0 0 ${root.getAttribute("width") || 1} ${root.getAttribute("height") || 1}`
  const [,, width = 1, height = 1] = viewBox.split(/\s+/).map(Number)
  const elements = [...root.querySelectorAll(SUPPORTED_ELEMENTS.join(","))].filter((element) => {
    const fill = colorFromElement(element)
    const dataLength = elementSize(element)
    return fill !== "none" && dataLength >= 12
  })

  const nameCounts = new Map()
  const layers = elements.map((element, index) => {
    const baseName = structuralName(element, index)
    const count = (nameCounts.get(baseName) || 0) + 1
    nameCounts.set(baseName, count)
    return {
    id: `layer-${String(index + 1).padStart(3, "0")}`,
    name: count === 1 ? baseName : `${baseName} ${count}`,
    type: element.tagName,
    attributes: attributesFromElement(element),
    fill: colorFromElement(element),
    opacity: Number(element.getAttribute("opacity") || element.style.opacity || 1),
    visible: true,
    locked: false,
    zIndex: index,
    bounds: elementBounds(element, width, height),
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    }
  })

  return { layers, width, height, viewBox }
}

export function layerToSvg(layer) {
  if (!layer || !layer.type && layer.renderType !== "raster") return ""
  if (layer.renderType === "raster" && layer.imageUrl) {
    const transform = layer.transform || {}
    const transformValue = [
      `translate(${transform.x || 0} ${transform.y || 0})`,
      `rotate(${transform.rotation || 0})`,
      `scale(${transform.scaleX || 1} ${transform.scaleY || 1})`,
    ].join(" ")
    if (!layer.maskAttributes) {
      return `<image data-layer-id="${escapeXml(layer.id || "")}" href="${escapeXml(layer.imageUrl)}" x="0" y="0" width="${layer.sourceWidth || layer.width || layer.bounds?.width || 1}" height="${layer.sourceHeight || layer.height || layer.bounds?.height || 1}" opacity="${layer.visible ? layer.opacity ?? 1 : 0}" transform="${transformValue}" preserveAspectRatio="none" />`
    }
    const clipId = `mask-${String(layer.id || "layer").replace(/[^a-zA-Z0-9_-]/g, "-")}`
    const maskAttributes = { ...(layer.maskAttributes || {}) }
    delete maskAttributes.fill
    delete maskAttributes.opacity
    const maskTransform = layer.maskTransform || { scaleX: 1, scaleY: 1 }
    const mask = `<${layer.maskType || "path"}${Object.entries(maskAttributes)
      .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
      .join("")} fill="#fff" transform="scale(${maskTransform.scaleX || 1} ${maskTransform.scaleY || 1})" />`
    return `<defs><clipPath id="${clipId}">${mask}</clipPath></defs><g data-layer-id="${escapeXml(layer.id || "")}" opacity="${layer.visible ? layer.opacity ?? 1 : 0}" transform="${transformValue}"><image href="${escapeXml(layer.imageUrl)}" x="0" y="0" width="${layer.sourceWidth || layer.width || 1}" height="${layer.sourceHeight || layer.height || 1}" clip-path="url(#${clipId})" preserveAspectRatio="none" /></g>`
  }
  const attributes = { ...(layer.attributes || {}) }
  attributes["data-layer-id"] = layer.id || ""
  attributes.fill = layer.fill || attributes.fill || "#000000"
  attributes.opacity = String(layer.opacity ?? 1)
  if (!layer.visible) attributes.opacity = "0"
  const transform = layer.transform || {}
  const transformValue = [
    `translate(${transform.x || 0} ${transform.y || 0})`,
    `rotate(${transform.rotation || 0})`,
    `scale(${transform.scaleX || 1} ${transform.scaleY || 1})`,
  ].join(" ")
  attributes.transform = transformValue
  const element = `<${layer.type || "path"}${Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join("")} />`
  if (!layer.crop) return element
  const clipId = `clip-${String(layer.id || "layer").replace(/[^a-zA-Z0-9_-]/g, "-")}`
  const crop = layer.crop
  return `<defs><clipPath id="${clipId}"><rect x="${crop.x || 0}" y="${crop.y || 0}" width="${crop.width || 1}" height="${crop.height || 1}" /></clipPath></defs><g clip-path="url(#${clipId})" data-layer-id="${escapeXml(layer.id || "")}">${element}</g>`
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export function layersToSvg(layers, width, height, viewBox = `0 0 ${width} ${height}`) {
  const content = [...layers]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(layerToSvg)
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${content}</svg>`
}
