import { lazy, Suspense, useEffect, useState } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import { EditorProvider } from "./store/EditorStore.jsx"
import Navbar from "./components/Navbar.jsx"
import Footer from "./components/Footer.jsx"
import SplashScreen from "./components/SplashScreen.jsx"
import Home from "./pages/Home.jsx"

// Editor and Result are heavier (canvas work) — load them on demand.
const Editor = lazy(() => import("./pages/Editor.jsx"))
const Result = lazy(() => import("./pages/Result.jsx"))
const About = lazy(() => import("./pages/About.jsx"))

function PageFallback() {
  return (
    <div className="page-fallback">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

// Scrolls to a #hash target after navigation (react-router doesn't do this),
// or to the top on a plain route change.
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section is mounted.
      const id = requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" })
      })
      return () => cancelAnimationFrame(id)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowSplash(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <EditorProvider>
      <div className="app-shell">
        {showSplash && <SplashScreen />}
        <ScrollManager />
        <Navbar />
        <main id="main">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/result" element={<Result />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </EditorProvider>
  )
}
