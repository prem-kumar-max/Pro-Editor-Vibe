import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon.jsx"

const POINTS = [
  {
    icon: "expand",
    title: "Purpose-built pipelines",
    desc: "Each tool runs its own configuration and stages — no shared, generic processing.",
  },
  {
    icon: "scissors",
    title: "Honest by design",
    desc: "Demo mode uses real, clearly-labelled browser transforms. It never pretends to be AI.",
  },
  {
    icon: "layers",
    title: "Backend-ready",
    desc: "A single processing seam lets you connect a real image API without touching the UI.",
  },
]

export default function About() {
  const navigate = useNavigate()
  useEffect(() => window.scrollTo(0, 0), [])

  return (
    <div className="container about-shell">
      <div className="section-head">
        <span className="eyebrow">About</span>
        <h1 className="section-title text-balance">A clean home for everyday image edits</h1>
        <p className="section-sub">
          KRP Design Studio is a focused image-editing front end for upscaling, layer separation, and
          background removal — with a workflow that goes from upload to download without friction.
        </p>
      </div>

      <div className="about-grid">
        {POINTS.map((p) => (
          <div key={p.title} className="about-card panel">
            <span className="service-icon">
              <Icon name={p.icon} size={22} />
            </span>
            <h3 className="about-card-title">{p.title}</h3>
            <p className="about-card-desc">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="about-cta">
        <button className="btn btn-primary btn-lg" onClick={() => navigate("/#services")}>
          Explore the services <Icon name="arrowRight" size={18} />
        </button>
      </div>
    </div>
  )
}
