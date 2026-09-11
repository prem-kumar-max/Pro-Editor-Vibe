import { useRef, useState } from "react"
import Icon from "./Icon.jsx"
import {
  ACCEPT_ATTR,
  ACCEPTED_FORMATS,
  describeFile,
  validateFile,
} from "../utils/fileUtils.js"

const FORMAT_LABELS = [...new Set(ACCEPTED_FORMATS.map((f) => f.label))]

export default function UploadZone({ onAccepted, onError }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (fileList) => {
    const file = fileList?.[0]
    if (!file) return
    const { valid, error } = validateFile(file)
    if (!valid) {
      onError?.(error)
      return
    }
    const meta = describeFile(file)
    onAccepted?.(meta, URL.createObjectURL(file))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const openPicker = () => inputRef.current?.click()

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      openPicker()
    }
  }

  return (
    <div
      className={`upload-zone${dragging ? " is-dragging" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Upload your image. Drag and drop or activate to browse files."
      onKeyDown={onKeyDown}
      onClick={openPicker}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <span className="upload-icon">
        <Icon name="upload" size={30} />
      </span>
      <p className="upload-title">Upload Your Image</p>
      <p className="upload-hint">
        Drag &amp; drop your image here, or{" "}
        <span className="upload-browse">browse files</span>
      </p>
      <ul className="upload-formats" aria-label="Supported formats">
        {FORMAT_LABELS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  )
}
