import { Link } from "react-router-dom"
import logoSrc from "../../ASSECTS/KRP Design Studio Logo 441.png"
import Icon from "./Icon.jsx"

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand-mark">
            <img src={logoSrc} alt="KRP Design Studio" />
          </span>
          <div>
            <p className="footer-name">KRP Design Studio</p>
            <p className="footer-tag">Professional image editing, made simple.</p>
          </div>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/#services">Services</Link>
          <Link to="/#how-it-works">How It Works</Link>
          <Link to="/about">About</Link>
        </nav>

        <p className="footer-copy">
          {"\u00A9"} {new Date().getFullYear()} KRP Design Studio. Built with React + Vite.
        </p>
      </div>
    </footer>
  )
}
