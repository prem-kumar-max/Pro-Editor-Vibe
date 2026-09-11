import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"
import "./index.css"
import logoSrc from "../ASSECTS/KRP Design Studio Logo 441.png"

const favicon = document.querySelector('link[rel="icon"]')
if (favicon) favicon.href = logoSrc

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
