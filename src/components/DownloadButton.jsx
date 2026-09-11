import { useState } from "react"
import Icon from "./Icon.jsx"
import { buildOutputName, downloadBlob } from "../utils/fileUtils.js"

// Downloads the processed result, preserving the original name and using the
// actual encoded extension/MIME (never a blind rename).
export default function DownloadButton({ meta, result }) {
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    setBusy(true)
    try {
      let blob = result.blob
      if (!blob && result.resultUrl) {
        const res = await fetch(result.resultUrl)
        blob = await res.blob()
      }
      if (!blob) throw new Error("No downloadable data")
      const filename = buildOutputName(meta.name, "edited", result.outputExtension)
      downloadBlob(blob, filename)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="btn btn-primary btn-lg btn-block" onClick={handleDownload} disabled={busy}>
      <Icon name="download" size={18} />
      {busy ? "Preparing download..." : "Download Result"}
    </button>
  )
}
