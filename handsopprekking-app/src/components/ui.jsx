import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";

export function FyModal({ onClose }) {
  return (
    <div className="fy-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="fy-modal-title">
      <div className="fy-modal">
        <h2 id="fy-modal-title">FY deg, det er ikke lov :) !</h2>
        <button type="button" className="primary-button" onClick={onClose}>
          Ok, jeg skal vÃ¦re snill
        </button>
      </div>
    </div>
  );
}

export function NumberInput({ label, value, onChange, suffix, step = "0.01", helper }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-shell">
        <input type="number" step={step} value={value} onChange={(event) => onChange(event.target.value)} />
        {suffix && <small>{suffix}</small>}
      </div>
      {helper && <p className="helper">{helper}</p>}
    </label>
  );
}

export function SelectInput({ label, value, onChange, children, helper }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      {helper && <p className="helper">{helper}</p>}
    </label>
  );
}

export function HelpButton({ open, setOpen }) {
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="help-button"
      aria-label="Vis hjelp"
      title="Vis hjelp"
    >
      <HelpCircle size={20} />
    </button>
  );
}

export function StepCard({ number, title, children }) {
  return (
    <section className="step-card">
      <p className="step-title">
        {number}. {title}
      </p>
      {children}
    </section>
  );
}

export function StatusLine({ ok, title, labels, values, text }) {
  return (
    <div className={`status-line ${ok ? "status-ok" : "status-error"}`}>
      {ok ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
      <div>
        <strong>{title}</strong>
        {labels && <div className="formula">{labels}</div>}
        {values && <div className="formula strong">{values}</div>}
        {text && <p>{text}</p>}
      </div>
    </div>
  );
}

export function StatsPanel({ title, eyebrow, subtitle, children }) {
  return (
    <section className="stats-panel">
      <div>
        <p className="portal-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {subtitle && <p className="muted-text">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function BarRow({ label, value, max }) {
  return (
    <div className="bar-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}
