import Icon from "./Icon.jsx"

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state panel" role="alert">
      <span className="error-icon">
        <Icon name="alert" size={26} />
      </span>
      <h2 className="error-title">Something went wrong.</h2>
      <p className="error-msg">{message || "We couldn't process your image."}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Try Again
        </button>
      )}
    </div>
  )
}
