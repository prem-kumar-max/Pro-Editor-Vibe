import Icon from "./Icon.jsx"

export default function Hero({ onStart }) {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy rise">
          <span className="eyebrow">
            <Icon name="spark" size={13} /> Image editing toolkit
          </span>
          <h1 className="hero-title text-balance">Professional Image Editing, Made Simple</h1>
          <p className="hero-sub text-pretty">
            Upscale images, create editable layers, remove backgrounds, and prepare your images for
            any workflow.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onStart}>
              Start Editing <Icon name="arrowRight" size={18} />
            </button>
            <a className="btn btn-ghost btn-lg" href="#how-it-works">
              How it works
            </a>
          </div>
          <ul className="hero-formats" aria-label="Supported formats">
            {["PNG", "JPG", "WEBP", "SVG", "AVIF", "PSD"].map((f) => (
              <li key={f}>{f}</li>
            ))}
            <li className="hero-formats-more">+6 more</li>
          </ul>
        </div>

        <div className="hero-visual rise" aria-hidden="true">
          <div className="hero-card panel">
            <div className="hero-card-head">
              <span className="hero-dot" />
              <span className="hero-dot" />
              <span className="hero-dot" />
            </div>
            <div className="hero-canvas checkerboard">
              <div className="hero-subject" />
            </div>
            <div className="hero-toolbar">
              <span className="hero-tool"><Icon name="expand" size={16} /> Upscale</span>
              <span className="hero-tool"><Icon name="layers" size={16} /> Layers</span>
              <span className="hero-tool active"><Icon name="scissors" size={16} /> Cutout</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
