import { useRef, useState } from "react"

// Draggable before/after comparison slider.
export default function BeforeAfter({ beforeUrl, afterUrl, afterTransparent }) {
  const [pos, setPos] = useState(50)
  const frameRef = useRef(null)

  const setFromClientX = (clientX) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e) => {
    if (e.buttons !== 1) return
    setFromClientX(e.clientX)
  }

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4))
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4))
  }

  return (
    <div className="ba" ref={frameRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
      <img src={beforeUrl} alt="Original image" className="ba-img" draggable={false} />
      <div className={`ba-after${afterTransparent ? " checkerboard" : ""}`} style={{ width: `${pos}%` }}>
        <img
          src={afterUrl}
          alt="Processed result"
          className="ba-img ba-img-clip"
          draggable={false}
          style={{ width: frameRef.current ? `${frameRef.current.clientWidth}px` : "100%" }}
        />
      </div>
      <div className="ba-handle" style={{ left: `${pos}%` }} aria-hidden="true">
        <span className="ba-knob" />
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        onKeyDown={onKeyDown}
        className="ba-range"
        aria-label="Comparison slider position"
      />
      <span className="ba-tag ba-tag-left">Original</span>
      <span className="ba-tag ba-tag-right">Result</span>
    </div>
  )
}
