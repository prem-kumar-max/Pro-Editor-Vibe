import Icon from "./Icon.jsx"
import BeforeAfter from "./BeforeAfter.jsx"
import LayersPanel from "./LayersPanel.jsx"

function Dimensions({ original, result }) {
  if (!original && !result) return null
  return (
    <div className="dims">
      {original && (
        <div className="dim">
          <span className="dim-label">Original</span>
          <span className="dim-val">
            {original.width} {"\u00D7"} {original.height}
          </span>
        </div>
      )}
      {result && (
        <>
          <Icon name="arrowRight" size={16} className="dim-arrow" />
          <div className="dim">
            <span className="dim-label">Result</span>
            <span className="dim-val">
              {result.width} {"\u00D7"} {result.height}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default function ResultPreview({ meta, previewUrl, result, showComparison }) {
  const isLayers = result.service === "magic-layers" && result.layers

  return (
    <div className="result">
      <div className="result-badge">
        <Icon name="check" size={16} /> Processing Complete
      </div>

      {isLayers ? (
        <LayersPanel
          layers={result.layers}
          layersAreSemantic={result.layersAreSemantic}
          layeredFile={result.layeredFile}
        />
      ) : showComparison && previewUrl && result.resultUrl ? (
        <BeforeAfter
          beforeUrl={previewUrl}
          afterUrl={result.resultUrl}
          afterTransparent={result.transparent}
        />
      ) : (
        <div className={`result-frame${result.transparent ? " checkerboard" : ""}`}>
          {result.resultUrl ? (
            <img src={result.resultUrl} alt="Processed result" className="result-img" />
          ) : (
            <div className="preview-fallback">
              <Icon name="image" size={30} />
              <p>Result ready to download</p>
            </div>
          )}
        </div>
      )}

      <Dimensions original={result.original} result={result.result} />

      {result.notice && (
        <p className="result-notice">
          <Icon name="alert" size={15} /> {result.notice}
        </p>
      )}
    </div>
  )
}
