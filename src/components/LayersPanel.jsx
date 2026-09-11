import { useMemo, useState } from "react"

// Renders backend masks or the clearly-labelled demo layers as a composited canvas.
export default function LayersPanel({ layers, layersAreSemantic = false, layeredFile = null }) {
  const [state, setState] = useState(() =>
    layers.reduce((acc, l) => {
      acc[l.id] = { visible: true, opacity: 100 }
      return acc
    }, {}),
  )

  const toggle = (id) =>
    setState((s) => ({ ...s, [id]: { ...s[id], visible: !s[id].visible } }))

  const setOpacity = (id, value) =>
    setState((s) => ({ ...s, [id]: { ...s[id], opacity: value } }))

  // Composite: draw visible, non-composite layers stacked (background first).
  const stack = useMemo(() => layers.filter((l) => l.id !== "full"), [layers])

  return (
    <div className="layers">
      <div className="layers-canvas checkerboard">
        {stack.map((layer) => {
          const st = state[layer.id]
          if (!st.visible) return null
          return (
            <img
              key={layer.id}
              src={layer.thumb}
              alt={`${layer.name} layer`}
              className="layers-stack-img"
              style={{ opacity: st.opacity / 100 }}
            />
          )
        })}
      </div>

      <div className="layers-list panel" role="group" aria-label="Layers">
        <div className="layers-heading">
          <p className="layers-title">Layers</p>
          <span className={`layers-status${layersAreSemantic ? " is-real" : ""}`}>
            {layersAreSemantic ? "Editable" : "Demo"}
          </span>
        </div>
        {stack.map((layer) => {
          const st = state[layer.id]
          return (
            <div key={layer.id} className="layer-row">
              <label className="layer-toggle">
                <input
                  type="checkbox"
                  checked={st.visible}
                  onChange={() => toggle(layer.id)}
                />
                <img src={layer.thumb} alt="" className="layer-thumb checkerboard" />
                <span className="layer-name">{layer.name}</span>
              </label>
              <label className="layer-opacity">
                <span className="sr-only">{layer.name} opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={st.opacity}
                  disabled={!st.visible}
                  onChange={(e) => setOpacity(layer.id, Number(e.target.value))}
                />
                <span className="layer-opacity-val">{st.opacity}%</span>
              </label>
            </div>
          )
        })}
        {layeredFile?.url && (
          <a
            className="btn btn-soft btn-block layers-export"
            href={layeredFile.url}
            download={layeredFile.filename || "image-layers.psd"}
          >
            Export Layered File
          </a>
        )}
      </div>
    </div>
  )
}
