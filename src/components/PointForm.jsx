import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { hasValidLocation } from '../utils/geo.js'

export default function PointForm({ point, location, suggestedName, categories, onSave, onCancel }) {
  const isNew = !point
  const [form, setForm] = useState({
    name: point?.name ?? suggestedName ?? '',
    category: point?.category ?? '',
    notes: point?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const locationValid = hasValidLocation(location)
  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!locationValid) return setError('Pick the point location on the map.')
    if (!form.name.trim()) return setError('Give the point a name, e.g. "Office".')
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h2>{isNew ? 'New point' : 'Edit point'}</h2>

      <div className={`location-box point${locationValid ? '' : ' is-missing'}`}>
        <MapPin size={16} aria-hidden="true" />
        <div>
          {locationValid ? (
            <>
              <strong>Location set</strong>
              <span>Click the map or drag the pin to move the point.</span>
            </>
          ) : (
            <>
              <strong>No location yet</strong>
              <span>Click on the map to place this point.</span>
            </>
          )}
        </div>
      </div>

      <label className="field">
        <span>Name *</span>
        <input value={form.name} onChange={set('name')} placeholder="Office, University, Parents…" maxLength={100} />
      </label>

      <label className="field">
        <span>Category</span>
        <input value={form.category} onChange={set('category')} placeholder="Optional, e.g. Work" maxLength={100} list="point-categories" />
        <datalist id="point-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Optional" maxLength={5000} />
      </label>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-point" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Save point' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
