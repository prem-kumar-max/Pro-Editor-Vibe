import Icon from "./Icon.jsx"

export default function ServiceCard({ service, onUse }) {
  return (
    <article className="service-card panel">
      <span className="service-icon">
        <Icon name={service.icon} size={24} />
      </span>
      <h3 className="service-title">{service.title}</h3>
      <p className="service-desc">{service.tagline}</p>
      <button
        className="btn btn-soft service-btn"
        onClick={() => onUse(service.id)}
      >
        Use Service <Icon name="arrowRight" size={16} />
      </button>
    </article>
  )
}
