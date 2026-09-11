// Browser-only processing abstraction. User images never leave this device.

import {
  demoUpscale,
  demoRemoveBackground,
  readDimensions,
} from "../utils/imageUtils.js"
import { canCanvasEncode } from "../utils/imageUtils.js"
import { createMagicLayers } from "./magicLayersEngine.js"

export const USE_MOCK_PROCESSING = true

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Drives the staged progress UI. onProgress({ percent, stageIndex }).
async function runStages(stages, onProgress, totalMs = 2600) {
  const per = totalMs / stages.length
  for (let i = 0; i < stages.length; i++) {
    const start = (i / stages.length) * 100
    const end = ((i + 1) / stages.length) * 100
    const steps = 6
    for (let s = 0; s <= steps; s++) {
      const percent = Math.round(start + ((end - start) * s) / steps)
      onProgress?.({ percent, stageIndex: i })
      await sleep(per / steps)
    }
  }
  onProgress?.({ percent: 100, stageIndex: stages.length - 1 })
}

/**
 * Unified entry point.
 * @returns { service, mode, blob?, resultUrl, mime, outputExtension,
 *            formatChanged, notice?, original, result, layers?, layeredFile?, transparent }
 */
export async function processImage({ service, meta, settings = {}, stages = [], onProgress }) {
  return processMock({ service, meta, settings, stages, onProgress })
}

// -------------------------------------------------------------------------
// MOCK (development) — honest browser-side transforms, clearly labelled.
// -------------------------------------------------------------------------
async function processMock({ service, meta, settings, stages, onProgress }) {
  if (service === "magic-layers") {
    const stageIndexes = { "Analyzing image": 0, "Detecting objects": 1, "Separating elements": 2, "Creating layers": 3, "Preparing editable result": 4 }
    const out = await createMagicLayers(meta.file, settings, ({ percent, label }) => {
      onProgress?.({ percent, stageIndex: stageIndexes[label] ?? Math.min(stages.length - 1, Math.floor(percent / 20)) })
    })
    return {
      service: "magic-layers",
      mode: "semantic-segmentation",
      resultUrl: null,
      blob: null,
      mime: "image/png",
      outputExtension: "png",
      formatChanged: false,
      transparent: true,
      original: { width: out.sourceWidth, height: out.sourceHeight },
      result: { width: out.width, height: out.height },
      layers: out.layers,
      svg: null,
      viewBox: out.viewBox,
      width: out.width,
      height: out.height,
      settings: out.settings,
      layersAreSemantic: out.layersAreSemantic,
      notice: out.notice,
    }
  }

  await runStages(stages, onProgress)

  switch (service) {
    case "upscaler":
      return mockUpscaler(meta, settings)
    case "remove-background":
      return mockRemoveBackground(meta, settings)
    default:
      throw new Error("Unknown service")
  }
}

async function mockUpscaler(meta, settings) {
  const scale = settings.scale || 2
  const canvasEncodable = canCanvasEncode(meta.extension)
  if (!canvasEncodable) {
    // Can't decode/encode this format in the browser — be honest about it.
    const dims = (await readDimensions(meta.file)) || { width: 0, height: 0 }
    return {
      service: "upscaler",
      mode: "mock",
      resultUrl: null,
      blob: meta.file,
      mime: meta.type,
      outputExtension: meta.extension,
      formatChanged: false,
      transparent: false,
      original: dims,
      result: { width: dims.width * scale, height: dims.height * scale },
      notice: `${meta.label} needs a server-side engine to upscale. In demo mode the original file is returned unchanged.`,
    }
  }
  const out = await demoUpscale(meta.file, scale, meta.extension)
  return {
    service: "upscaler",
    mode: "mock",
    resultUrl: URL.createObjectURL(out.blob),
    blob: out.blob,
    mime: out.mime,
    outputExtension: out.outputExtension,
    formatChanged: out.formatChanged,
    transparent: false,
    original: out.original,
    result: out.result,
    notice: out.formatChanged
      ? `This browser-only demo re-encoded the image to PNG because the original format is not canvas-encodable.`
      : "Demo mode uses a high-quality resample, not AI super-resolution.",
  }
}

async function mockRemoveBackground(meta, settings) {
  const out = await demoRemoveBackground(meta.file, settings)
  return {
    service: "remove-background",
    mode: "mock",
    resultUrl: URL.createObjectURL(out.blob),
    blob: out.blob,
    mime: out.mime,
    outputExtension: "png",
    formatChanged: meta.extension !== "png",
    transparent: true,
    original: out.original,
    result: out.result,
    notice:
      "Demo mode uses a color-key heuristic (not AI segmentation). Output is PNG to preserve transparency.",
  }
}

