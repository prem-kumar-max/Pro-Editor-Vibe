import Icon from "./Icon.jsx"

// stages: string[], activeStage: index of current stage, percent: 0-100
export default function ProcessingScreen({ stages, activeStage, percent }) {
  return (
    <div className="processing panel">
      <div className="processing-head">
        <span className="spinner" aria-hidden="true" />
        <h2 className="processing-title">Processing Your Image</h2>
        <p className="processing-sub">Please wait while we process your image. Do not close this page.</p>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Processing progress"
      >
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-pct">{percent}%</p>

      <ol className="stages">
        {stages.map((stage, i) => {
          const state = i < activeStage ? "done" : i === activeStage ? "active" : "todo"
          return (
            <li key={stage} className={`stage stage-${state}`}>
              <span className="stage-marker" aria-hidden="true">
                {state === "done" ? (
                  <Icon name="check" size={13} />
                ) : state === "active" ? (
                  <span className="stage-dot" />
                ) : null}
              </span>
              <span className="stage-label">{stage}</span>
              <span className="sr-only">
                {state === "done" ? "completed" : state === "active" ? "in progress" : "pending"}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
