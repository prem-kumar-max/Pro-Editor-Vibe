import test from "node:test"
import assert from "node:assert/strict"
import { hasFullCanvasGeometry } from "../src/services/magicLayers.js"

test("every extracted layer occupies the source canvas", () => {
  const source = { width: 640, height: 480 }
  const returnedLayers = [
    { x: 0, y: 0, width: source.width, height: source.height },
    { x: 0, y: 0, width: source.width, height: source.height },
  ]
  assert.equal(hasFullCanvasGeometry(returnedLayers, source.width, source.height), true)
})