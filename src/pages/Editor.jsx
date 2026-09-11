import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useEditor } from "../store/EditorStore.jsx"
import { getService, SERVICE_LIST } from "../services/servicesConfig.js"
import { processImage, USE_MOCK_PROCESSING } from "../services/imageProcessing.js"
import UploadZone from "../components/UploadZone.jsx"
import ImagePreview from "../components/ImagePreview.jsx"
import ServiceSettings from "../components/ServiceSettings.jsx"
import ProcessingScreen from "../components/ProcessingScreen.jsx"
import ErrorState from "../components/ErrorState.jsx"
import Icon from "../components/Icon.jsx"

export default function Editor() {
  const navigate = useNavigate()
  const {
    selectedService,
    setSelectedService,
    meta,
    setFile,
    clearFile,
    previewUrl,
    settings,
    setSettings,
    setResult,
    resetEditor,
  } = useEditor()

  const [uploadError, setUploadError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [percent, setPercent] = useState(0)
  const [activeStage, setActiveStage] = useState(0)
  const [processError, setProcessError] = useState(null)

  const service = getService(selectedService)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // No service selected -> show service selection UI in-page.
  if (!service) {
    return (
      <div className="container editor-shell">
        <div className="empty panel">
          <span className="empty-icon">
            <Icon name="spark" size={26} />
          </span>
          <h1 className="empty-title">Choose an image editing service to get started.</h1>
          <p className="empty-sub">Select one of the services below to open its editor.</p>
          <div className="empty-services">
            {SERVICE_LIST.map((s) => (
              <button
                key={s.id}
                className="btn btn-soft"
                onClick={() => {
                  setSelectedService(s.id)
                  resetEditor()
                }}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const runProcessing = async () => {
    if (!meta || isProcessing) return
    setProcessError(null)
    setIsProcessing(true)
    setPercent(0)
    setActiveStage(0)
    try {
      const result = await processImage({
        service: service.id,
        meta,
        settings,
        stages: service.stages,
        onProgress: ({ percent: p, stageIndex }) => {
          setPercent(p)
          if (typeof stageIndex === "number") setActiveStage(stageIndex)
        },
      })
      setResult(result)
      navigate("/result")
    } catch (err) {
      // Detailed error only in dev logs; user sees a friendly message.
      console.error("[KRP] Processing failed:", err?.message)
      setProcessError(err?.message || "We couldn't process your image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container editor-shell">
      <div className="editor-top">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/#services")}>
          Change service
        </button>
        <div className="editor-heading">
          <span className="service-icon service-icon-sm">
            <Icon name={service.icon} size={20} />
          </span>
          <div>
            <h1 className="editor-title">{service.title}</h1>
            <p className="editor-desc">{service.description}</p>
          </div>
        </div>
        {USE_MOCK_PROCESSING && service.id !== "magic-layers" && (
          <span className="mock-badge" title="No backend connected — running local demo transforms">
            Demo mode
          </span>
        )}
      </div>

      {isProcessing ? (
        <ProcessingScreen stages={service.stages} activeStage={activeStage} percent={percent} />
      ) : processError ? (
        <ErrorState message={processError} onRetry={runProcessing} />
      ) : (
        <div className="editor-grid">
          <section className="editor-main">
            {!meta ? (
              <>
                <UploadZone
                  onAccepted={(m, url) => {
                    setUploadError(null)
                    setFile(m, url)
                  }}
                  onError={(msg) => setUploadError(msg)}
                />
                {uploadError && (
                  <p className="field-error" role="alert">
                    <Icon name="alert" size={15} /> {uploadError}
                  </p>
                )}
                <p className="editor-hint">Upload an image to continue.</p>
              </>
            ) : (
              <ImagePreview meta={meta} previewUrl={previewUrl} onReplace={clearFile} />
            )}
          </section>

          <aside className="editor-side">
            <div className="panel editor-panel">
              {service.id === "magic-layers" ? (
                <div className="magic-create-panel">
                  <span className="eyebrow">Magic Layers</span>
                  <h2 className="settings-legend">Create editable layers</h2>
                  <p className="settings-note">
                    Generate independent visual regions from your uploaded image. You can arrange,
                    edit, hide, duplicate, and export each layer after processing.
                  </p>
                  <ul className="magic-create-list">
                    <li>Analyze image regions</li>
                    <li>Create transparent layer assets</li>
                    <li>Open the editable layer canvas</li>
                  </ul>
                </div>
              ) : (
                <ServiceSettings
                  service={service.id}
                  settings={settings}
                  onChange={setSettings}
                />
              )}
              <button
                className="btn btn-primary btn-block editor-submit"
                onClick={runProcessing}
                disabled={!meta}
              >
                {service.id === "magic-layers" ? "Generate Magic Layers" : "Submit & Process"}
              </button>
              {!meta && <p className="editor-side-hint">Add an image to enable processing.</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
