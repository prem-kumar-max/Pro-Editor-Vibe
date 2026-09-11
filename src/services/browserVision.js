const MODEL_URLS = {
  detector: import.meta.env.VITE_GROUNDING_DINO_MODEL_URL || "",
  segmenter: import.meta.env.VITE_SAM2_MODEL_URL || "",
  ocr: import.meta.env.VITE_OCR_MODEL_URL || "",
}

export function getBrowserVisionStatus() {
  return {
    detector: Boolean(MODEL_URLS.detector),
    segmenter: Boolean(MODEL_URLS.segmenter),
    ocr: Boolean(MODEL_URLS.ocr),
    ready: Boolean(MODEL_URLS.detector && MODEL_URLS.segmenter),
    localOnly: true,
  }
}

export async function analyzeWithBrowserVision() {
  const status = getBrowserVisionStatus()
  if (!status.ready) {
    return {
      available: false,
      status,
      reason: "Local Grounding DINO and SAM 2 model URLs are not configured.",
      detections: [],
      masks: [],
      text: [],
    }
  }

  throw new Error(
    "Browser vision models are configured but need model-specific ONNX adapters before inference can run safely.",
  )
}
