import express from "express"
import cors from "cors"
import multer from "multer"
import fetch from "node-fetch"
import FormData from "form-data"

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

const PORT = process.env.PORT || 3001
const INFERENCE_URL = process.env.INFERENCE_URL || "http://localhost:8000"
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173"

app.use(cors({ origin: FRONTEND_ORIGIN }))
app.use(express.json())

function buildForm(file, fields = {}) {
  const form = new FormData()
  form.append("image", file.buffer, {
    filename: file.originalname || "image.png",
    contentType: file.mimetype || "image/png",
  })
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    form.append(key, typeof value === "string" ? value : JSON.stringify(value))
  })
  return form
}

async function forwardToInference(path, form) {
  const response = await fetch(`${INFERENCE_URL}${path}`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`inference ${path} returned HTTP ${response.status}: ${text}`)
  }
  return JSON.parse(text)
}

app.post("/api/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "missing image file" })
    const form = buildForm(req.file, { prompt: req.body.prompt })
    const result = await forwardToInference("/detect", form)
    res.json(result)
  } catch (error) {
    console.error("[/api/detect]", error)
    res.status(502).json({ error: error.message })
  }
})

app.post("/api/segment", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "missing image file" })
    if (!req.body.box) return res.status(400).json({ error: "missing box field" })
    const form = buildForm(req.file, { box: req.body.box })
    const result = await forwardToInference("/segment", form)
    res.json(result)
  } catch (error) {
    console.error("[/api/segment]", error)
    res.status(502).json({ error: error.message })
  }
})

app.post("/api/segment-all", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "missing image file" })
    const form = buildForm(req.file, {
      points_per_batch: req.body.pointsPerBatch,
      max_masks: req.body.maxMasks,
    })
    const result = await forwardToInference("/segment-all", form)
    res.json(result)
  } catch (error) {
    console.error("[/api/segment-all]", error)
    res.status(502).json({ error: error.message })
  }
})

app.post("/api/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "missing image file" })
    const form = buildForm(req.file)
    const result = await forwardToInference("/ocr", form)
    res.json(result)
  } catch (error) {
    console.error("[/api/ocr]", error)
    res.status(502).json({ error: error.message })
  }
})

app.get("/health", async (_req, res) => {
  try {
    const response = await fetch(`${INFERENCE_URL}/health`)
    const inferenceHealth = await response.json()
    res.json({ status: "ok", inference: inferenceHealth })
  } catch (error) {
    res.status(502).json({ status: "inference unreachable", error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Magic Layers proxy server listening on port ${PORT}`)
  console.log(`Forwarding to inference service at ${INFERENCE_URL}`)
})
