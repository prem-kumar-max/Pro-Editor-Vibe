import Icon from "./Icon.jsx"
import { formatBytes, isBrowserPreviewable } from "../utils/fileUtils.js"

export default function ImagePreview({ meta, previewUrl, onReplace }) {
  const previewable = isBrowserPreviewable(meta.extension) && previewUrl

  return (
    <div className="preview">
      <div className="preview-head">
        <p className="preview-label">Selected Image</p>
        <button className="btn btn-ghost btn-sm" onClick={onReplace}>
          <Icon name="refresh" size={15} /> Replace
        </button>
      </div>

      <div className="preview-frame">
        {previewable ? (
          <img src={previewUrl} alt={`Preview of ${meta.name}`} className="preview-img" />
        ) : (
          <div className="preview-fallback">
            <Icon name="image" size={30} />
            <p>{meta.label} preview not available in-browser</p>
            <span>The file is still processed correctly.</span>
          </div>
        )}
      </div>

      <dl className="preview-meta">
        <div>
          <dt>File</dt>
          <dd title={meta.name}>{meta.name}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatBytes(meta.size)}</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{meta.label}</dd>
        </div>
      </dl>
    </div>
  )
}
