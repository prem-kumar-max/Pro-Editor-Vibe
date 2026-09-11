import { initVtracer, vectorize_rgba } from "./vtracerWasm.js"

export const MAGIC_PRESETS = {
  detailed: {
    preset: "photo",
    clustering: "color-cluster",
    hierarchical: "stacked",
    mode: "spline",
    maxColors: 32,
    filterSpeckle: 2,
    simplify: 1,
    optimize: 2,
    pathPrecision: 2,
  },
  balanced: {
    preset: "poster",
    clustering: "color-cluster",
    hierarchical: "stacked",
    mode: "spline",
    maxColors: 8,
    filterSpeckle: 14,
    simplify: 2.5,
    optimize: 1,
    pathPrecision: 2,
  },
  simple: {
    preset: "poster",
    clustering: "color-cluster",
    hierarchical: "cutout",
    mode: "polygon",
    maxColors: 8,
    filterSpeckle: 8,
    simplify: 2.5,
    optimize: 2,
    pathPrecision: 2,
  },
  poster: {
    preset: "poster",
    clustering: "color-cluster",
    hierarchical: "cutout",
    mode: "polygon",
    maxColors: 6,
    filterSpeckle: 12,
    simplify: 3,
    optimize: 2,
    pathPrecision: 1,
  },
}

export const DEFAULT_MAGIC_SETTINGS = {
  preset: "balanced",
  clustering: "color-cluster",
  hierarchical: "stacked",
  mode: "spline",
  maxColors: 8,
  detail: 60,
  simplify: 2.5,
  optimize: 1,
  processingSize: 900,
}

export function getTracerOptions(settings = {}) {
  const preset = MAGIC_PRESETS[settings.preset] || MAGIC_PRESETS.balanced
  return {
    ...preset,
    clustering: settings.clustering || preset.clustering,
    hierarchical: settings.hierarchical || preset.hierarchical,
    mode: settings.mode || preset.mode,
    maxColors: Number(settings.maxColors || preset.maxColors),
    simplify: Number(settings.simplify ?? preset.simplify),
    optimize: Number(settings.optimize ?? preset.optimize),
    watershedDetail: Math.max(64, Number(settings.detail || 60) * 3),
  }
}

export async function vectorizeImage(imageData, width, height, options = {}) {
  await initVtracer()
  return vectorize_rgba(new Uint8Array(imageData), width, height, options)
}
