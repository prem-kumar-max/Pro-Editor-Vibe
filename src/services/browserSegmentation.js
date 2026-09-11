import { pipeline } from "@xenova/transformers"

const MODEL_ID = "Xenova/segformer-b0-finetuned-ade-512-512"
let segmenterPromise

function getSegmenter() {
  if (!segmenterPromise) segmenterPromise = pipeline("image-segmentation", MODEL_ID)
  return segmenterPromise
}

function maskPixels(mask) {
  const data = mask?.data || mask
  if (!data || typeof data.length !== "number") throw new Error("Segmentation model returned an unreadable mask")
  return data
}

function maskDimensions(mask, sourceWidth, sourceHeight) {
  const dims = mask?.dims
  const hasImageDims = Array.isArray(dims) && dims.length >= 2
  return {
    width: Number(mask?.width || (hasImageDims ? dims[dims.length - 1] : sourceWidth)),
    height: Number(mask?.height || (hasImageDims ? dims[dims.length - 2] : sourceHeight)),
  }
}

function maskValue(data, index, channels, channelFirst = false, pixelCount = 0) {
  if (channels <= 1) return Number(data[index])
  let total = 0
  for (let channel = 0; channel < channels; channel += 1) {
    const offset = channelFirst ? channel * pixelCount + index : index * channels + channel
    total += Number(data[offset])
  }
  return total / channels
}

function maskAlpha(mask, sourceWidth, sourceHeight) {
  const maskData = maskPixels(mask)
  const { width: maskWidth, height: maskHeight } = maskDimensions(mask, sourceWidth, sourceHeight)
  const pixelCount = maskWidth * maskHeight
  const channels = Math.max(1, Math.round(maskData.length / pixelCount))
  const channelFirst = Array.isArray(mask?.dims) && mask.dims.length === 3 && mask.dims[0] === channels
  const values = new Float32Array(pixelCount)
  let maxValue = 0
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    values[pixel] = maskValue(maskData, pixel, channels, channelFirst, pixelCount)
    maxValue = Math.max(maxValue, values[pixel])
  }
  const threshold = maxValue <= 1 ? 0.5 : 127
  return { values, width: maskWidth, height: maskHeight, threshold }
}

function makeMaskCanvas(mask, sourceWidth, sourceHeight) {
  const { values, width: maskWidth, height: maskHeight, threshold } = maskAlpha(mask, sourceWidth, sourceHeight)
  const maskCanvas = document.createElement("canvas")
  maskCanvas.width = maskWidth
  maskCanvas.height = maskHeight
  const maskContext = maskCanvas.getContext("2d")
  const maskImage = maskContext.createImageData(maskWidth, maskHeight)
  for (let pixel = 0; pixel < values.length; pixel += 1) {
    const normalized = threshold === 0.5 ? values[pixel] : values[pixel] / 255
    const alpha = Math.max(0, Math.min(255, Math.round(normalized * 255)))
    const offset = pixel * 4
    maskImage.data[offset] = 255
    maskImage.data[offset + 1] = 255
    maskImage.data[offset + 2] = 255
    maskImage.data[offset + 3] = alpha
  }
  maskContext.putImageData(maskImage, 0, 0)
  return maskCanvas
}

function maskBounds(maskCanvas) {
  const { width, height } = maskCanvas
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
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function makeLayerUrl(sourceCanvas, maskCanvas, sourceWidth, sourceHeight) {

  const output = document.createElement("canvas")
  output.width = sourceWidth
  output.height = sourceHeight
  const outputContext = output.getContext("2d")
  outputContext.drawImage(sourceCanvas, 0, 0)
  outputContext.globalCompositeOperation = "destination-in"
  outputContext.drawImage(maskCanvas, 0, 0, sourceWidth, sourceHeight)
  outputContext.globalCompositeOperation = "source-over"
  return new Promise((resolve, reject) => output.toBlob((blob) => {
    if (!blob) reject(new Error("Could not encode segmented layer"))
    else resolve(URL.createObjectURL(blob))
  }, "image/png"))
}

function splitConnectedComponents(maskCanvas, sourceWidth, sourceHeight) {
  const width = maskCanvas.width
  const height = maskCanvas.height
  const alpha = maskCanvas.getContext("2d").getImageData(0, 0, width, height).data
  const visited = new Uint8Array(width * height)
  const components = []
  const minimumArea = Math.max(12, Math.round(width * height * 0.00015))
  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || alpha[start * 4 + 3] < 16) continue
    const queue = [start]
    const pixels = []
    visited[start] = 1
    while (queue.length) {
      const current = queue.pop()
      pixels.push(current)
      const x = current % width
      const y = Math.floor(current / width)
      for (const [dx, dy] of neighbors) {
        const nextX = x + dx
        const nextY = y + dy
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue
        const next = nextY * width + nextX
        if (!visited[next] && alpha[next * 4 + 3] >= 16) {
          visited[next] = 1
          queue.push(next)
        }
      }
    }
    if (pixels.length < minimumArea) continue
    const component = document.createElement("canvas")
    component.width = width
    component.height = height
    const image = component.getContext("2d").createImageData(width, height)
    for (const pixel of pixels) image.data[pixel * 4 + 3] = alpha[pixel * 4 + 3]
    component.getContext("2d").putImageData(image, 0, 0)
    components.push({ canvas: component, bounds: maskBounds(component), area: pixels.length / (width * height) })
  }
  return components.length ? components : [{ canvas: maskCanvas, bounds: maskBounds(maskCanvas), area: 1 }]
}

function splitVisualComponents(sourceCanvas, maskCanvas, sourceWidth, sourceHeight) {
  const sampleWidth = Math.min(128, sourceWidth)
  const sampleHeight = Math.max(1, Math.round(sourceHeight * sampleWidth / sourceWidth))
  const imageSample = document.createElement("canvas")
  imageSample.width = sampleWidth
  imageSample.height = sampleHeight
  imageSample.getContext("2d").drawImage(sourceCanvas, 0, 0, sampleWidth, sampleHeight)
  const maskSample = document.createElement("canvas")
  maskSample.width = sampleWidth
  maskSample.height = sampleHeight
  maskSample.getContext("2d").drawImage(maskCanvas, 0, 0, sampleWidth, sampleHeight)
  const imageData = imageSample.getContext("2d").getImageData(0, 0, sampleWidth, sampleHeight).data
  const alpha = maskSample.getContext("2d").getImageData(0, 0, sampleWidth, sampleHeight).data
  const visited = new Uint8Array(sampleWidth * sampleHeight)
  const components = []
  const minimumArea = Math.max(6, Math.round(sampleWidth * sampleHeight * 0.00045))
  const colorDistance = (first, second) => Math.abs(first[0] - second[0]) + Math.abs(first[1] - second[1]) + Math.abs(first[2] - second[2])
  for (let start = 0; start < sampleWidth * sampleHeight; start += 1) {
    if (visited[start] || alpha[start * 4 + 3] < 16) continue
    const queue = [start]
    const pixels = []
    visited[start] = 1
    const seedColor = [imageData[start * 4], imageData[start * 4 + 1], imageData[start * 4 + 2]]
    while (queue.length) {
      const current = queue.pop()
      pixels.push(current)
      const x = current % sampleWidth
      const y = Math.floor(current / sampleWidth)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nextX = x + dx
        const nextY = y + dy
        if (nextX < 0 || nextY < 0 || nextX >= sampleWidth || nextY >= sampleHeight) continue
        const next = nextY * sampleWidth + nextX
        const nextColor = [imageData[next * 4], imageData[next * 4 + 1], imageData[next * 4 + 2]]
        if (!visited[next] && alpha[next * 4 + 3] >= 16 && colorDistance(seedColor, nextColor) < 42) {
          visited[next] = 1
          queue.push(next)
        }
      }
    }
    if (pixels.length < minimumArea) continue
    const lowMask = document.createElement("canvas")
    lowMask.width = sampleWidth
    lowMask.height = sampleHeight
    const lowImage = lowMask.getContext("2d").createImageData(sampleWidth, sampleHeight)
    for (const pixel of pixels) lowImage.data[pixel * 4 + 3] = alpha[pixel * 4 + 3]
    lowMask.getContext("2d").putImageData(lowImage, 0, 0)
    const fullMask = document.createElement("canvas")
    fullMask.width = sourceWidth
    fullMask.height = sourceHeight
    fullMask.getContext("2d").drawImage(lowMask, 0, 0, sourceWidth, sourceHeight)
    components.push({ canvas: fullMask, bounds: maskBounds(fullMask), area: pixels.length / (sampleWidth * sampleHeight) })
  }
  return components.sort((first, second) => second.area - first.area).slice(0, 48)
}

export async function segmentAllLayers(imageElement) {
  if (!imageElement?.naturalWidth || !imageElement?.naturalHeight) throw new Error("A loaded image is required for segmentation")
  const width = imageElement.naturalWidth
  const height = imageElement.naturalHeight
  const sourceCanvas = document.createElement("canvas")
  sourceCanvas.width = width
  sourceCanvas.height = height
  sourceCanvas.getContext("2d").drawImage(imageElement, 0, 0, width, height)
  const segment = await getSegmenter()
  const predictions = await segment(imageElement)
  const masks = Array.isArray(predictions) ? predictions : [predictions]
  const names = new Map()
  const layers = []
  for (const prediction of masks) {
    if (!prediction?.mask) continue
    const baseLabel = String(prediction.label || "Element")
    const semanticMask = makeMaskCanvas(prediction.mask, width, height)
    let components = splitConnectedComponents(semanticMask, width, height)
    if (components.length === 1) components = splitVisualComponents(sourceCanvas, semanticMask, width, height)
    for (const component of components) {
      const count = (names.get(baseLabel) || 0) + 1
      names.set(baseLabel, count)
      const label = count === 1 ? baseLabel : `${baseLabel} ${count}`
      layers.push({ label, layerUrl: await makeLayerUrl(sourceCanvas, component.canvas, width, height), score: Number(prediction.score ?? 1), bounds: component.bounds })
    }
  }
  return layers
}