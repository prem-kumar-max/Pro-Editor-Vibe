import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import logoSrc from "../../ASSECTS/KRP Design Studio Logo 441.png"
import Icon from "./Icon.jsx"

const LINKS = [
  { label: "Home", to: "/", hash: "" },
  { label: "Services", to: "/", hash: "#services" },
  { label: "How It Works", to: "/", hash: "#how-it-works" },
  { label: "About", to: "/about", hash: "" },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const go = (link) => {
    setOpen(false)
    if (link.hash && location.pathname === "/") {
      document.querySelector(link.hash)?.scrollIntoView({ behavior: "smooth" })
    } else {
      navigate(link.to + link.hash)
    }
  }

  const startEditing = () => {
    setOpen(false)
    if (location.pathname === "/") {
      document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })
    } else {
      navigate("/#services")
    }
  }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="KRP Design Studio home">
          <span className="brand-mark">
            <img src={logoSrc} alt="KRP Design Studio" />
          </span>
          <span className="brand-name">KRP Design Studio</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((link) => (
            <button key={link.label} className="nav-link" onClick={() => go(link)}>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="nav-cta">
          <button className="btn btn-primary" onClick={startEditing}>
            Start Editing
          </button>
        </div>

        <button
          className="nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} size={22} />
        </button>
      </div>

      {open && (
        <div className="nav-mobile" role="menu">
          <div className="container nav-mobile-inner">
            {LINKS.map((link) => (
              <button
                key={link.label}
                className="nav-mobile-link"
                role="menuitem"
                onClick={() => go(link)}
              >
                {link.label}
              </button>
            ))}
            <button className="btn btn-primary btn-block" onClick={startEditing}>
              Start Editing
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
