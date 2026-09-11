import { Component, useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useEditor } from "../store/EditorStore.jsx"
import { getService } from "../services/servicesConfig.js"
import ResultPreview from "../components/ResultPreview.jsx"
import DownloadButton from "../components/DownloadButton.jsx"
import Icon from "../components/Icon.jsx"
import MagicLayersEditor from "../components/MagicLayersEditor.jsx"
import { processImage } from "../services/imageProcessing.js"

class ResultErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return <div className="panel result-error"><h2>We could not display the generated layers.</h2><p>{this.state.error?.message || "Try processing the image again."}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button></div>
  }
}

export default function Result() {
  const navigate = useNavigate()
  const { selectedService, meta, previewUrl, result, resetEditor, resetAll, setResult } = useEditor()
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Route protection: no result in state means the user landed here directly.
  useEffect(() => {
    if (!result) navigate("/editor", { replace: true })
    else window.scrollTo(0, 0)
  }, [result, navigate])

  if (!result) return <Navigate to="/editor" replace />

  const service = getService(selectedService)

  const processAnother = () => {
    resetEditor()
    navigate("/editor")
  }

  const changeService = () => {
    resetAll()
    navigate("/#services")
  }

  const regenerateLayers = async (settings) => {
    if (!meta || isRegenerating) return
    setIsRegenerating(true)
    try {
      const nextResult = await processImage({
        service: "magic-layers",
        meta,
        settings,
        stages: getService("magic-layers").stages,
      })
      setResult(nextResult)
    } catch (error) {
      console.error("[KRP] Magic Layers regeneration failed:", error)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (result.service === "magic-layers") {
    return (
      <div className="container result-shell">
        <div className="result-head">
          <span className="eyebrow">Magic Layers</span>
          <h1 className="result-page-title text-balance">Edit your image regions</h1>
          <p className="section-sub">Change colors, opacity, visibility, order, and names, then export a clean SVG or PNG.</p>
        </div>
        <ResultErrorBoundary>
          <MagicLayersEditor meta={meta} previewUrl={previewUrl} result={result} onRegenerate={regenerateLayers} isRegenerating={isRegenerating} />
        </ResultErrorBoundary>
        <div className="result-footer-actions">
          <button className="btn btn-soft" onClick={processAnother}><Icon name="refresh" size={16} /> New image</button>
          <button className="btn btn-ghost" onClick={changeService}>Change service</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container result-shell">
      <div className="result-head">
        <span className="eyebrow">{service?.title}</span>
        <h1 className="result-page-title text-balance">Your image is ready</h1>
      </div>

      <div className="result-grid">
        <ResultPreview
          meta={meta}
          previewUrl={previewUrl}
          result={result}
          showComparison={service?.comparison}
        />

        <aside className="result-actions panel">
          <p className="result-actions-title">Result actions</p>
          {meta && result && <DownloadButton meta={meta} result={result} />}
          <button className="btn btn-soft btn-block" onClick={processAnother}>
            <Icon name="refresh" size={16} /> Process Another Image
          </button>
          <button className="btn btn-ghost btn-block" onClick={changeService}>
            Change Service
          </button>
          {result.formatChanged && (
            <p className="result-actions-note">
              Output is <strong>.{result.outputExtension.toUpperCase()}</strong> because the
              original format could not preserve this result in the current pipeline.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
