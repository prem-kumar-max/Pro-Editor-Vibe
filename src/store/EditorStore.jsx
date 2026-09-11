import { createContext, useContext, useState, useCallback } from "react"

// Shared editor state so it survives navigation between /editor and /result
// and enables route protection (e.g. redirect off /result with no result).
const EditorContext = createContext(null)

export function EditorProvider({ children }) {
  const [selectedService, setSelectedService] = useState(null)
  const [meta, setMeta] = useState(null) // { file, name, size, type, extension, label }
  const [previewUrl, setPreviewUrl] = useState(null)
  const [settings, setSettings] = useState({})
  const [result, setResult] = useState(null)

  // Replace the file, cleaning up the previous object URL.
  const setFile = useCallback((nextMeta, nextPreviewUrl) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextPreviewUrl
    })
    setMeta(nextMeta)
  }, [])

  const clearFile = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setMeta(null)
  }, [])

  // Reset everything except the chosen service ("Process Another Image").
  const resetEditor = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setResult((prev) => {
      if (prev?.resultUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.resultUrl)
      return null
    })
    setMeta(null)
    setSettings({})
  }, [])

  // Full reset ("Change Service").
  const resetAll = useCallback(() => {
    resetEditor()
    setSelectedService(null)
  }, [resetEditor])

  const value = {
    selectedService,
    setSelectedService,
    meta,
    setFile,
    clearFile,
    previewUrl,
    settings,
    setSettings,
    result,
    setResult,
    resetEditor,
    resetAll,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error("useEditor must be used within EditorProvider")
  return ctx
}
