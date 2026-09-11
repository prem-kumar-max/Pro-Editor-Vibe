import logoSrc from "../../ASSECTS/KRP Design Studio Logo 441.png"

export default function SplashScreen() {
  return (
    <div className="splash-screen" role="status" aria-live="polite">
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <img className="splash-logo" src={logoSrc} alt="KRP Design Studio" />
        </div>
        <p className="splash-kicker">Image Editing Studio</p>
        <span className="splash-loader" aria-hidden="true" />
        <span className="sr-only">Loading KRP Design Studio</span>
      </div>
    </div>
  )
}