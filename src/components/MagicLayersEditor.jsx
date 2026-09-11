import { useEffect, useMemo, useRef, useState } from "react"
import Icon from "./Icon.jsx"
import { exportPng } from "../services/exportPng.js"
import { exportSvg } from "../services/exportSvg.js"
import { exportProjectJson, exportProjectZip } from "../services/exportProject.js"
import { layersToSvg } from "../utils/svgParser.js"

function LayerRow({ layer, selected, menuOpen, onSelect, onChange, onMove, onDelete, onDuplicate, onToggleMenu, onDragStart, onDrop }) {
  return (
    <div
      className={`canva-layer-row${selected ? " is-selected" : ""}`}
      draggable
      onDragStart={() => onDragStart(layer.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(layer.id)}
      onClick={() => onSelect(layer.id)}
    >
      <button className="canva-grip" aria-label={`Arrange ${layer.name}`} title="Drag to arrange">⋮⋮</button>
      <button className="canva-icon-button" aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`} onClick={(event) => { event.stopPropagation(); onChange({ visible: !layer.visible }) }}>
        <Icon name={layer.visible ? "eye" : "eyeOff"} size={17} />
      </button>
      <span className="canva-layer-thumb checkerboard"><img src={layer.imageUrl} alt="" /></span>
      <input className="canva-layer-name" value={layer.name} disabled={layer.locked} aria-label="Layer name" onClick={(event) => event.stopPropagation()} onChange={(event) => onChange({ name: event.target.value })} />
      <button className="canva-icon-button" aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`} onClick={(event) => { event.stopPropagation(); onChange({ locked: !layer.locked }) }}>
        <Icon name={layer.locked ? "lock" : "unlock"} size={15} />
      </button>
      <div className={`canva-more${menuOpen ? " is-open" : ""}`} aria-label={`More actions for ${layer.name}`}>
        <button className="canva-more-trigger" aria-expanded={menuOpen} aria-label={`More actions for ${layer.name}`} title="More actions" onClick={(event) => { event.stopPropagation(); onToggleMenu(layer.id) }}>
          <span aria-hidden="true">•••</span>
        </button>
        <span className="canva-row-menu" onClick={(event) => event.stopPropagation()}>
          <button onClick={() => { onDuplicate(layer.id); onToggleMenu(null) }}>Duplicate</button>
          <button onClick={() => { onMove(-1); onToggleMenu(null) }}>Move up</button>
          <button onClick={() => { onMove(1); onToggleMenu(null) }}>Move down</button>
          <button onClick={() => { onChange({ transform: { ...(layer.transform || {}), scaleX: -(layer.transform?.scaleX || 1) } }); onToggleMenu(null) }}>Flip horizontal</button>
          <button onClick={() => { onChange({ transform: { ...(layer.transform || {}), scaleY: -(layer.transform?.scaleY || 1) } }); onToggleMenu(null) }}>Flip vertical</button>
          <button onClick={() => { onDelete(layer.id); onToggleMenu(null) }}>Delete</button>
        </span>
      </div>
      <div className="canva-layer-opacity">
        <input type="range" min="0" max="100" value={Math.round(layer.opacity * 100)} disabled={layer.locked} aria-label={`${layer.name} opacity`} onClick={(event) => event.stopPropagation()} onChange={(event) => onChange({ opacity: Number(event.target.value) / 100 })} />
        <span>{Math.round(layer.opacity * 100)}%</span>
      </div>
    </div>
  )
}

export default function MagicLayersEditor({ previewUrl, result, onRegenerate, isRegenerating }) {
  const normalizeLayers = (items) => (Array.isArray(items) ? items.filter(Boolean).map((layer, index) => ({
    ...layer,
    id: layer.id || `layer-${index + 1}`,
    name: typeof layer.name === "string" && layer.name.trim() ? layer.name : `Element ${index + 1}`,
    opacity: Number.isFinite(Number(layer.opacity)) ? Number(layer.opacity) : 1,
    visible: layer.visible !== false,
    locked: layer.locked === true,
    zIndex: Number.isFinite(Number(layer.zIndex)) ? Number(layer.zIndex) : index,
    detached: layer.detached === true,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, ...(layer.transform || {}) },
  })) : [])
  const [layers, setLayers] = useState(() => normalizeLayers(result.layers))
  const [selectedId, setSelectedId] = useState(() => normalizeLayers(result.layers)[0]?.id || null)
  const [view, setView] = useState("layers")
  const [scale, setScale] = useState(1)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [draggedId, setDraggedId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const pointerDrag = useRef(null)
  const canvasRef = useRef(null)
  const selected = layers.find((layer) => layer.id === selectedId) || null
  const svg = useMemo(() => {
    try {
      return layersToSvg(layers, result.width, result.height, result.viewBox)
    } catch (error) {
      console.error("[KRP] Could not compose Magic Layers:", error)
      return result.svg || `<svg xmlns="http://www.w3.org/2000/svg" width="${result.width || 1}" height="${result.height || 1}" />`
    }
  }, [layers, result])

  useEffect(() => {
    const nextLayers = normalizeLayers(result.layers)
    setLayers(nextLayers)
    setSelectedId(nextLayers[0]?.id || null)
  }, [result])

  const updateLayer = (id, changes) => setLayers((current) => current.map((layer) => (layer.id === id && (changes.locked !== undefined || changes.detached !== undefined || !layer.locked) ? { ...layer, ...changes } : layer)))

  const moveLayer = (id, direction) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next.map((layer, layerIndex) => ({ ...layer, zIndex: layerIndex }))
    })
  }

  const arrangeLayer = (id, position) => {
    setLayers((current) => {
      const index = current.findIndex((layer) => layer.id === id)
      if (index < 0) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      if (position === "front") next.push(item)
      else if (position === "back") next.unshift(item)
      else next.splice(Math.max(0, Math.min(next.length, index + (position === "forward" ? 1 : -1))), 0, item)
      return next.map((layer, layerIndex) => ({ ...layer, zIndex: layerIndex }))
    })
  }

  const deleteLayer = (id) => {
    setLayers((current) => current.filter((layer) => layer.id !== id).map((layer, index) => ({ ...layer, zIndex: index })))
    if (selectedId === id) setSelectedId(null)
  }

  const duplicateLayer = (id) => {
    setLayers((current) => {
      const source = current.find((layer) => layer.id === id)
      if (!source) return current
      const copy = { ...source, id: `${source.id}-copy-${Date.now()}`, name: `${source.name} copy`, transform: { ...(source.transform || {}), x: (source.transform?.x || 0) + 12, y: (source.transform?.y || 0) + 12 }, zIndex: current.length }
      setSelectedId(copy.id)
      return [...current, copy]
    })
  }

  const dropLayer = (targetId) => {
    if (!draggedId || draggedId === targetId) return
    setLayers((current) => {
      const from = current.findIndex((layer) => layer.id === draggedId)
      const to = current.findIndex((layer) => layer.id === targetId)
      if (from < 0 || to < 0) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next.map((layer, index) => ({ ...layer, zIndex: index }))
    })
    setDraggedId(null)
  }

  const visibleLayers = [...layers].reverse().filter((layer) => layer.name.toLowerCase().includes(search.toLowerCase())).filter((layer) => filter === "all" || layer.id === selectedId)
  const downloadSvg = () => exportSvg(layers, result.width, result.height, result.viewBox, "magic-layers.svg")
  const downloadPng = () => exportPng(layers, result.width, result.height, result.viewBox, scale, "transparent", "magic-layers.png")
  const downloadProject = () => exportProjectJson(layers, result)
  const downloadZip = () => exportProjectZip(layers, result, svg)

  useEffect(() => {
    const moveSelected = (event) => {
      if (!pointerDrag.current || !selected || selected.locked || !selected.detached) return
      if (pointerDrag.current.mode === "resize") {
        const delta = (event.clientX - pointerDrag.current.clientX + event.clientY - pointerDrag.current.clientY) / 220
        const nextScale = Math.max(0.1, Math.min(8, pointerDrag.current.scale + delta))
        updateLayer(selected.id, { transform: { ...(selected.transform || {}), scaleX: nextScale, scaleY: nextScale } })
        return
      }
      updateLayer(selected.id, { transform: { ...(selected.transform || {}), x: pointerDrag.current.x + event.clientX - pointerDrag.current.clientX, y: pointerDrag.current.y + event.clientY - pointerDrag.current.clientY } })
    }
    const stopDragging = () => { pointerDrag.current = null }
    window.addEventListener("pointermove", moveSelected)
    window.addEventListener("pointerup", stopDragging)
    return () => { window.removeEventListener("pointermove", moveSelected); window.removeEventListener("pointerup", stopDragging) }
  }, [selected])

  const selectFromCanvas = (event) => {
    const target = event.target.closest?.("[data-layer-id]")
    const id = target?.getAttribute("data-layer-id")
    if (id) {
      event.stopPropagation()
      setSelectedId(id)
      const layer = layers.find((item) => item.id === id)
      if (view === "layers" && layer && !layer.locked && layer.detached) {
        pointerDrag.current = { clientX: event.clientX, clientY: event.clientY, x: layer.transform?.x || 0, y: layer.transform?.y || 0 }
      }
    }
  }

  const stopCanvasDrag = () => {
    pointerDrag.current = null
  }

  const startResize = (event, direction) => {
    event.stopPropagation()
    if (!selected || selected.locked || !selected.detached) return
    pointerDrag.current = { mode: "resize", direction, clientX: event.clientX, clientY: event.clientY, scale: selected.transform?.scaleX || 1 }
  }

  const rotateSelected = () => {
    if (!selected || selected.locked || !selected.detached) return
    updateLayer(selected.id, { transform: { ...(selected.transform || {}), rotation: (selected.transform?.rotation || 0) + 15 } })
  }

  const selectionOverlay = selected?.bounds ? (
    <div className="magic-selection" style={{ left: `${(selected.bounds.x / result.width) * 100}%`, top: `${(selected.bounds.y / result.height) * 100}%`, width: `${(selected.bounds.width / result.width) * 100}%`, height: `${(selected.bounds.height / result.height) * 100}%`, transform: `translate(${selected.transform?.x || 0}px, ${selected.transform?.y || 0}px) rotate(${selected.transform?.rotation || 0}deg) scale(${selected.transform?.scaleX || 1})` }} onPointerDown={(event) => event.stopPropagation()}>
      <button className="magic-rotate-handle" aria-label="Rotate selected layer" onClick={rotateSelected}>↻</button>
      {["nw", "ne", "sw", "se"].map((name) => <button key={name} className={`magic-resize-handle ${name}`} aria-label={`Resize selected layer ${name}`} onPointerDown={(event) => startResize(event, name)} />)}
    </div>
  ) : null

  return (
    <div className="magic-workspace">
      <div className="magic-toolbar panel">
        <div><span className="eyebrow">Magic Layers</span><h2>Edit your design layers</h2></div>
        <div className="magic-toolbar-actions">
          <div className="segmented" role="tablist" aria-label="Preview mode">{["original", "layers"].map((mode) => <button key={mode} className={`segmented-btn${view === mode ? " active" : ""}`} onClick={() => setView(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}</div>
          <div className="canva-arrange-actions" aria-label="Arrange selected layer">
            <button onClick={() => selected && arrangeLayer(selected.id, "back")} disabled={!selected}>Back</button>
            <button onClick={() => selected && arrangeLayer(selected.id, "forward")} disabled={!selected}>Forward</button>
            <button onClick={() => selected && arrangeLayer(selected.id, "front")} disabled={!selected}>Front</button>
          </div>
          <button className="btn btn-primary" onClick={downloadPng}>Download PNG</button>
          <button className="btn btn-soft" onClick={downloadSvg}>Download SVG</button>
          <button className="btn btn-ghost" onClick={downloadZip}>ZIP</button>
          <button className="btn btn-ghost" onClick={downloadProject}>Project</button>
          <button className="btn btn-ghost" onClick={() => onRegenerate?.(result.settings)} disabled={isRegenerating}>{isRegenerating ? "Regenerating..." : "Regenerate"}</button>
        </div>
      </div>

      <div className="magic-editor-grid">
        <section ref={canvasRef} className="magic-canvas panel checkerboard" aria-label="Design canvas" onPointerDown={selectFromCanvas} onPointerUp={stopCanvasDrag}>
          {view === "original" && previewUrl && <img src={previewUrl} alt="Original uploaded image" className="magic-original" />}
          {view === "layers" && <div className="magic-stage" style={{ transform: `scale(${scale})` }}>
            <div className="magic-svg" dangerouslySetInnerHTML={{ __html: svg }} />
              {selectionOverlay}
          </div>}
          {view === "layers" && <div className="magic-canvas-footer"><span>Zoom {Math.round(scale * 100)}%</span><input type="range" min="0.5" max="2" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} aria-label="Zoom" /></div>}
        </section>

        <aside className="canva-layers-drawer" aria-label="Layers panel">
          <div className="canva-drawer-header"><div><strong>Layers</strong><span className="canva-drawer-subtitle">Select, arrange, and adjust</span></div></div>
          <div className="canva-arrange-bar" aria-label="Arrange selected layer">
            <span>Arrange</span>
            <button onClick={() => selected && arrangeLayer(selected.id, "back")} disabled={!selected}>Back</button>
            <button onClick={() => selected && arrangeLayer(selected.id, "forward")} disabled={!selected}>Forward</button>
            <button onClick={() => selected && arrangeLayer(selected.id, "front")} disabled={!selected}>Front</button>
          </div>
          <div className="canva-filter-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "overlapping" ? "active" : ""} onClick={() => setFilter("overlapping")}>Overlapping</button></div>
          <label className="canva-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search layers" aria-label="Search layers" /></label>
          <div className="canva-layer-stack" onClick={() => setOpenMenuId(null)}>{visibleLayers.map((layer) => <LayerRow key={layer.id} layer={layer} selected={selectedId === layer.id} menuOpen={openMenuId === layer.id} onSelect={setSelectedId} onChange={(changes) => updateLayer(layer.id, changes)} onMove={(direction) => moveLayer(layer.id, direction * -1)} onDelete={deleteLayer} onDuplicate={duplicateLayer} onToggleMenu={setOpenMenuId} onDragStart={setDraggedId} onDrop={dropLayer} />)}</div>
          {selected && <div className="canva-properties">
            <div className="canva-properties-title"><strong>{selected.name}</strong><span>{selected.type || "Element"}</span></div>
            <div className="canva-property-grid">
              <label>X<input type="number" value={selected.transform?.x || 0} disabled={selected.locked || !selected.detached} onChange={(event) => updateLayer(selected.id, { transform: { ...selected.transform, x: Number(event.target.value) } })} /></label>
              <label>Y<input type="number" value={selected.transform?.y || 0} disabled={selected.locked || !selected.detached} onChange={(event) => updateLayer(selected.id, { transform: { ...selected.transform, y: Number(event.target.value) } })} /></label>
              <label>W<input type="number" value={result.width} readOnly disabled /></label>
              <label>H<input type="number" value={result.height} readOnly disabled /></label>
              <label>Rotation<input type="number" value={Math.round(selected.transform?.rotation || 0)} disabled={selected.locked} onChange={(event) => updateLayer(selected.id, { transform: { ...selected.transform, rotation: Number(event.target.value) } })} /></label>
            </div>
            <button className="canva-crop-button" onClick={() => updateLayer(selected.id, { detached: true, locked: false })} disabled={selected.detached}>Enable move and rotate</button>
          </div>}
          <div className="canva-drawer-footer"><span>{layers.length} layers</span><span>Drag to arrange</span></div>
        </aside>
      </div>
    </div>
  )
}
