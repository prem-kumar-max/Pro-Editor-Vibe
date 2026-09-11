import { useNavigate } from "react-router-dom"
import Hero from "../components/Hero.jsx"
import ServiceSelector from "../components/ServiceSelector.jsx"
import Icon from "../components/Icon.jsx"
import { useEditor } from "../store/EditorStore.jsx"

const STEPS = [
  { n: "01", title: "Choose a service", desc: "Pick upscaling, layers, or background removal." },
  { n: "02", title: "Upload your image", desc: "Drag & drop or browse. We validate it instantly." },
  { n: "03", title: "Download your result", desc: "Preview, compare, and export in your format." },
]

export default function Home() {
  const navigate = useNavigate()
  const { setSelectedService, resetEditor } = useEditor()

  const scrollToServices = () =>
    document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })

  const useService = (id) => {
    setSelectedService(id)
    resetEditor()
    navigate("/editor")
  }

  return (
    <>
      <Hero onStart={scrollToServices} />

      <ServiceSelector
        heading="Three focused tools, one clean workflow"
        sub="Each service runs its own dedicated pipeline. Pick one to jump straight into the editor."
        onUse={useService}
      />

      <section id="how-it-works" className="section how">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How it works</span>
            <h2 className="section-title text-balance">From upload to download in three steps</h2>
          </div>
          <div className="how-grid">
            {STEPS.map((step, i) => (
              <div key={step.n} className="how-step panel">
                <span className="how-num">{step.n}</span>
                <h3 className="how-title">{step.title}</h3>
                <p className="how-desc">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <span className="how-arrow" aria-hidden="true">
                    <Icon name="arrowRight" size={18} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-band">
        <div className="container cta-inner panel">
          <div>
            <h2 className="cta-title text-balance">Ready to edit your first image?</h2>
            <p className="cta-sub">Choose a service and get a downloadable result in seconds.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={scrollToServices}>
            Start Editing <Icon name="arrowRight" size={18} />
          </button>
        </div>
      </section>
    </>
  )
}
