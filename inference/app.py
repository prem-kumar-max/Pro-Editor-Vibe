"""
Magic Layers inference service.

Exposes three HTTP endpoints matching what server/index.js forwards to,
and what src/services/magicLayers.js on the frontend already expects
after normalization:

  POST /detect   -> { "detections": [{ "box": [x,y,w,h], "label": str, "score": float }, ...] }
  POST /segment  -> { "mask": "data:image/png;base64,...." }   (white/opaque = selected region)
  POST /ocr      -> { "regions": [{ "box": [x,y,w,h], "label": "Text", "score": float }, ...] }
  GET  /health   -> { "status": "ok", "models_loaded": bool, "device": str }

Models load once at startup (not per-request) into global state.
"""

import base64
import io
import json
import logging

import numpy as np
import torch
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageFilter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("inference")

app = FastAPI(title="Magic Layers Inference Service")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
logger.info("Using device: %s", DEVICE)

_state = {"loaded": False}
_models = {}


@app.on_event("startup")
def load_models():
    """Load Grounding DINO, SAM, and EasyOCR once at process startup."""
    from transformers import (
        AutoProcessor,
        AutoModelForZeroShotObjectDetection,
        SamModel,
        SamProcessor,
        pipeline as hf_pipeline,
    )
    import easyocr

    logger.info("Loading Grounding DINO (IDEA-Research/grounding-dino-tiny)...")
    _models["dino_processor"] = AutoProcessor.from_pretrained(
        "IDEA-Research/grounding-dino-tiny"
    )
    _models["dino_model"] = AutoModelForZeroShotObjectDetection.from_pretrained(
        "IDEA-Research/grounding-dino-tiny"
    ).to(DEVICE)
    _models["dino_model"].eval()

    logger.info("Loading SAM (facebook/sam-vit-base)...")
    _models["sam_processor"] = SamProcessor.from_pretrained("facebook/sam-vit-base")
    _models["sam_model"] = SamModel.from_pretrained("facebook/sam-vit-base").to(DEVICE)
    _models["sam_model"].eval()

    logger.info("Loading SAM automatic mask generator...")
    _models["mask_generator"] = hf_pipeline(
        "mask-generation",
        model=_models["sam_model"],
        image_processor=_models["sam_processor"].image_processor,
        device=0 if DEVICE == "cuda" else -1,
    )

    logger.info("Loading EasyOCR...")
    _models["ocr_reader"] = easyocr.Reader(["en"], gpu=(DEVICE == "cuda"))

    _state["loaded"] = True
    logger.info("All models loaded and ready.")


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": _state["loaded"], "device": DEVICE}


def _read_image(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGB")


def _intersection_over_union(first, second):
    first_x, first_y, first_w, first_h = first
    second_x, second_y, second_w, second_h = second
    left = max(first_x, second_x)
    top = max(first_y, second_y)
    right = min(first_x + first_w, second_x + second_w)
    bottom = min(first_y + first_h, second_y + second_h)
    intersection = max(0, right - left) * max(0, bottom - top)
    union = first_w * first_h + second_w * second_h - intersection
    return intersection / union if union else 0


def _visual_region_masks(image: Image.Image, minimum_pixels: int = 8):
    """Return coarse connected visual regions for images with weak model proposals."""
    preview_width = min(128, image.width)
    preview_height = max(1, round(image.height * preview_width / image.width))
    preview = np.asarray(image.resize((preview_width, preview_height)))
    quantized = preview // 32
    visited = np.zeros((preview_height, preview_width), dtype=bool)
    regions = []

    for start_y in range(preview_height):
        for start_x in range(preview_width):
            if visited[start_y, start_x]:
                continue
            seed = quantized[start_y, start_x]
            queue = [(start_y, start_x)]
            visited[start_y, start_x] = True
            pixels = []
            while queue:
                y, x = queue.pop()
                pixels.append((y, x))
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    next_y, next_x = y + dy, x + dx
                    if next_y < 0 or next_x < 0 or next_y >= preview_height or next_x >= preview_width:
                        continue
                    if visited[next_y, next_x] or np.abs(quantized[next_y, next_x].astype(int) - seed.astype(int)).sum() > 2:
                        continue
                    visited[next_y, next_x] = True
                    queue.append((next_y, next_x))
            if len(pixels) < minimum_pixels:
                continue
            mask = np.zeros((preview_height, preview_width), dtype=bool)
            ys, xs = zip(*pixels)
            mask[ys, xs] = True
            full_mask = np.asarray(Image.fromarray(mask).resize(image.size, Image.Resampling.NEAREST), dtype=bool)
            area = float(full_mask.sum())
            if area / float(image.width * image.height) < 0.001:
                continue
            regions.append((full_mask, area))
    return sorted(regions, key=lambda item: item[1], reverse=True)[:48]


@app.post("/detect")
async def detect(
    image: UploadFile = File(...),
    prompt: str = Form("person. background. foreground object. text."),
):
    if not _state["loaded"]:
        return JSONResponse({"error": "models still loading"}, status_code=503)

    data = await image.read()
    pil_image = _read_image(data)

    processor = _models["dino_processor"]
    model = _models["dino_model"]

    inputs = processor(images=pil_image, text=prompt, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        outputs = model(**inputs)

    results = processor.post_process_grounded_object_detection(
        outputs,
        inputs.input_ids,
        box_threshold=0.25,
        text_threshold=0.2,
        target_sizes=[pil_image.size[::-1]],  # (height, width)
    )[0]

    detections = []
    for box, score, label in zip(results["boxes"], results["scores"], results["labels"]):
        x0, y0, x1, y1 = [float(v) for v in box.tolist()]
        clean_label = (label or "object").strip().rstrip(".") or "object"
        if clean_label.lower() in {"text", "words", "letter", "sign", "caption"}:
            continue
        detections.append(
            {
                "box": [x0, y0, x1 - x0, y1 - y0],
                "label": clean_label,
                "score": float(score),
            }
        )

    detections.sort(key=lambda item: item["score"], reverse=True)
    filtered_detections = []
    for detection in detections:
        if any(_intersection_over_union(detection["box"], existing["box"]) > 0.7 for existing in filtered_detections):
            continue
        filtered_detections.append(detection)

    return JSONResponse({"detections": filtered_detections})


@app.post("/segment")
async def segment(image: UploadFile = File(...), box: str = Form(...)):
    if not _state["loaded"]:
        return JSONResponse({"error": "models still loading"}, status_code=503)

    data = await image.read()
    pil_image = _read_image(data)
    x, y, w, h = json.loads(box)
    input_box = [[x, y, x + w, y + h]]

    processor = _models["sam_processor"]
    model = _models["sam_model"]

    inputs = processor(pil_image, input_boxes=[input_box], return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        outputs = model(**inputs)

    masks = processor.image_processor.post_process_masks(
        outputs.pred_masks.cpu(),
        inputs["original_sizes"].cpu(),
        inputs["reshaped_input_sizes"].cpu(),
    )
    # masks[0] shape: (num_boxes=1, num_pred_masks, H, W) -> pick the highest-IoU mask
    scores = outputs.iou_scores.cpu().numpy()[0][0]
    best_idx = int(np.argmax(scores))
    mask_array = masks[0][0][best_idx].numpy().astype(np.uint8) * 255

    alpha = Image.fromarray(mask_array, mode="L")
    # SAM can leave isolated one-pixel regions around high-contrast edges.
    # A small binary opening removes those speckles before the mask is returned.
    alpha = alpha.filter(ImageFilter.MinFilter(size=3)).filter(ImageFilter.MaxFilter(size=3))
    rgba = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
    rgba.putalpha(alpha)

    buffer = io.BytesIO()
    rgba.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return JSONResponse({"mask": f"data:image/png;base64,{encoded}"})


@app.post("/segment-all")
async def segment_all(
    image: UploadFile = File(...),
    points_per_batch: int = Form(64),
    max_masks: int = Form(40),
):
    """Find visually distinct regions without requiring object labels or boxes."""
    if not _state["loaded"]:
        return JSONResponse({"error": "models still loading"}, status_code=503)

    pil_image = _read_image(await image.read())
    width, height = pil_image.size
    total_area = float(width * height)
    outputs = _models["mask_generator"](
        pil_image,
        points_per_side=16,
        points_per_batch=max(4, min(int(points_per_batch), 16)),
    )
    raw_masks = outputs.get("masks", [])
    raw_scores = outputs.get("scores", [1.0] * len(raw_masks))
    candidates = []

    for mask_array, score in zip(raw_masks, raw_scores):
        mask = np.asarray(mask_array, dtype=bool)
        area = float(mask.sum())
        ratio = area / total_area if total_area else 0
        if ratio < 0.0003 or ratio > 0.98:
            continue
        ys, xs = np.where(mask)
        if not xs.size:
            continue
        candidates.append({
            "mask": mask,
            "area": area,
            "box": [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)],
            "score": float(score),
        })

    candidates.sort(key=lambda item: item["area"], reverse=True)
    kept = []
    for candidate in candidates:
        duplicate = any(
            (np.logical_and(candidate["mask"], existing["mask"]).sum() / min(candidate["area"], existing["area"])) > 0.98
            for existing in kept
        )
        if not duplicate:
            kept.append(candidate)
        if len(kept) >= max(1, min(int(max_masks), 100)):
            break

    visual_regions = _visual_region_masks(pil_image)
    if len(kept) < 2 and len(visual_regions) >= 2:
        # A single near-full-image SAM proposal is not useful as an element.
        # Replace it with the independent visual regions instead of treating
        # every region as a duplicate of that broad proposal.
        kept = []
        for mask, area in visual_regions:
            ys, xs = np.where(mask)
            kept.append({
                "mask": mask,
                "area": area,
                "box": [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)],
                "score": 0.5,
            })
            if len(kept) >= max(2, min(int(max_masks), 100)):
                break

    results = []
    for candidate in kept:
        alpha = Image.fromarray((candidate["mask"] * 255).astype(np.uint8), mode="L")
        alpha = alpha.filter(ImageFilter.MinFilter(size=3)).filter(ImageFilter.MaxFilter(size=3))
        rgba = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
        rgba.putalpha(alpha)
        buffer = io.BytesIO()
        rgba.save(buffer, format="PNG")
        results.append({
            "box": candidate["box"],
            "area": candidate["area"],
            "score": candidate["score"],
            "mask": f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}",
        })

    return JSONResponse({"masks": results})


@app.post("/ocr")
async def ocr(image: UploadFile = File(...)):
    if not _state["loaded"]:
        return JSONResponse({"error": "models still loading"}, status_code=503)

    data = await image.read()
    pil_image = _read_image(data)
    np_image = np.array(pil_image)

    reader = _models["ocr_reader"]
    results = reader.readtext(np_image, detail=1, paragraph=False, text_threshold=0.55, low_text=0.35, link_threshold=0.45)

    regions = []
    for bbox, _text, score in results:
        if float(score) < 0.45:
            continue
        xs = [point[0] for point in bbox]
        ys = [point[1] for point in bbox]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        box = [float(x0), float(y0), float(x1 - x0), float(y1 - y0)]
        if box[2] * box[3] < pil_image.width * pil_image.height * 0.00008:
            continue
        if any(_intersection_over_union(box, existing["box"]) > 0.55 for existing in regions):
            continue
        regions.append(
            {
                "box": box,
                "label": "Text",
                "score": float(score),
            }
        )

    return JSONResponse({"regions": regions})
