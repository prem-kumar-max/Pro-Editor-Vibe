import { SERVICE_LIST } from "../services/servicesConfig.js"
import ServiceCard from "./ServiceCard.jsx"

export default function ServiceSelector({ onUse, heading, sub }) {
  return (
    <section id="services" className="section services">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Services</span>
          <h2 className="section-title text-balance">{heading}</h2>
          {sub && <p className="section-sub">{sub}</p>}
        </div>
        <div className="services-grid">
          {SERVICE_LIST.map((service) => (
            <ServiceCard key={service.id} service={service} onUse={onUse} />
          ))}
        </div>
      </div>
    </section>
  )
}
