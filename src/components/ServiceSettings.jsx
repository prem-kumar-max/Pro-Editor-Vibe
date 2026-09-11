// Service-specific settings. Each service keeps its own configuration; they are
// never mixed. Adding a service means adding a branch here + config + handler.

function UpscalerSettings({ settings, onChange }) {
  const scale = settings.scale || 2
  return (
    <fieldset className="settings-group">
      <legend className="settings-legend">Upscale Settings</legend>
      <p className="settings-label">Scale factor</p>
      <div className="segmented" role="radiogroup" aria-label="Scale factor">
        {[2, 4].map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={scale === v}
            className={`segmented-btn${scale === v ? " active" : ""}`}
            onClick={() => onChange({ ...settings, scale: v })}
          >
            {v}x
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function SpillControl({ label, value, onChange }) {
  const enabled = value?.enabled || false
  const strength = value?.strength ?? 50
  return (
    <div className={`spill${enabled ? " spill-on" : ""}`}>
      <div className="spill-head">
        <span className="spill-name">{label}</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange({ enabled: e.target.checked, strength })}
          />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <span className="sr-only">{`Toggle ${label}`}</span>
        </label>
      </div>
      <div className="spill-strength">
        <label>
          <span className="spill-strength-label">
            Strength <strong>{strength}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="25"
            value={strength}
            disabled={!enabled}
            onChange={(e) => onChange({ enabled, strength: Number(e.target.value) })}
            aria-label={`${label} strength`}
          />
        </label>
      </div>
    </div>
  )
}

function BackgroundSettings({ settings, onChange }) {
  return (
    <fieldset className="settings-group">
      <legend className="settings-legend">Background Settings</legend>
      <SpillControl
        label="Green Spill Removal"
        value={settings.greenSpill}
        onChange={(v) => onChange({ ...settings, greenSpill: v })}
      />
      <SpillControl
        label="Blue Spill Removal"
        value={settings.blueSpill}
        onChange={(v) => onChange({ ...settings, blueSpill: v })}
      />
      <p className="settings-note">
        More edge tools (hair refinement, shadow removal) can be enabled here when a
        backend that supports them is connected.
      </p>
    </fieldset>
  )
}

export default function ServiceSettings({ service, settings, onChange }) {
  if (service === "upscaler") return <UpscalerSettings settings={settings} onChange={onChange} />
  if (service === "remove-background")
    return <BackgroundSettings settings={settings} onChange={onChange} />
  return null
}
