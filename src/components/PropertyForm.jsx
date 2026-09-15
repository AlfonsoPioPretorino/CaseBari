import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import ListEditor from './ListEditor.jsx'
import { reverseGeocode } from '../services/geocoding.js'
import { hasValidLocation } from '../utils/geo.js'

const fromProperty = (property) => ({
  title: property?.title ?? '',
  address: property?.address ?? '',
  rent: property?.rent ?? '',
  floor: property?.floor ?? '',
  url: property?.url ?? '',
  notes: property?.notes ?? '',
  pros: property?.pros ?? [],
  cons: property?.cons ?? [],
})

function validate(form) {
  if (form.rent !== '' && (!Number.isFinite(Number(form.rent)) || Number(form.rent) < 0)) return 'Rent must be a positive number.'
  if (form.floor !== '' && !Number.isInteger(Number(form.floor))) return 'Floor must be a whole number (0 = ground floor).'
  if (form.url) {
    try {
      const { protocol } = new URL(form.url)
      if (protocol !== 'http:' && protocol !== 'https:') throw new Error()
    } catch {
      return 'The listing URL must start with http:// or https://'
    }
  }
  return null
}

export default function PropertyForm({ property, location, suggestedAddress, onSave, onCancel }) {
  const isNew = !property
  const [form, setForm] = useState(() => ({ ...fromProperty(property), address: property?.address || suggestedAddress || '' }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)
  const addressTouched = useRef(Boolean(property?.address || suggestedAddress))

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  const locationValid = hasValidLocation(location)

  const lookupAddress = async (force) => {
    if (!locationValid) return
    setLookingUp(true)
    try {
      const address = await reverseGeocode(location.latitude, location.longitude)
      if (address && (force || !addressTouched.current)) setForm((prev) => ({ ...prev, address }))
    } catch {
      // Address lookup is a convenience only; the user can type the address.
    } finally {
      setLookingUp(false)
    }
  }

  // For new rentals, suggest an address whenever the pin moves, until the user types one.
  useEffect(() => {
    if (isNew && locationValid && !addressTouched.current) lookupAddress(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude])

  const submit = async (event) => {
    event.preventDefault()
    const problem = !locationValid ? 'Pick the rental location on the map.' : validate(form)
    if (problem) return setError(problem)
    setSaving(true)
    setError(null)
    try {
      await onSave({ ...form, pros: form.pros.map((s) => s.trim()).filter(Boolean), cons: form.cons.map((s) => s.trim()).filter(Boolean) })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h2>{isNew ? 'New rental' : 'Edit rental'}</h2>

      <div className={`location-box${locationValid ? '' : ' is-missing'}`}>
        <MapPin size={16} aria-hidden="true" />
        <div>
          {locationValid ? (
            <>
              <strong>Location set</strong>
              <span>Click the map or drag the pin to move it.</span>
            </>
          ) : (
            <>
              <strong>No location yet</strong>
              <span>Click on the map to place this rental.</span>
            </>
          )}
        </div>
      </div>

      <label className="field">
        <span>Title</span>
        <input value={form.title} onChange={set('title')} placeholder="e.g. Bright flat near the station" maxLength={200} />
      </label>

      <label className="field">
        <span className="field-label-row">
          Address
          {locationValid && (
            <button type="button" className="link-btn" onClick={() => lookupAddress(true)} disabled={lookingUp}>
              {lookingUp ? <Loader2 size={12} className="spin" /> : null} Use pin address
            </button>
          )}
        </span>
        <input
          value={form.address}
          onChange={(event) => {
            addressTouched.current = true
            set('address')(event)
          }}
          placeholder={lookingUp ? 'Looking up address…' : 'Street, number, neighborhood'}
          maxLength={300}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Monthly rent</span>
          <input type="number" inputMode="decimal" min="0" step="10" value={form.rent} onChange={set('rent')} placeholder="1200" />
        </label>
        <label className="field">
          <span>Floor</span>
          <input type="number" inputMode="numeric" step="1" value={form.floor} onChange={set('floor')} placeholder="0 = ground" />
        </label>
      </div>

      <label className="field">
        <span>Listing URL</span>
        <input type="url" inputMode="url" value={form.url} onChange={set('url')} placeholder="https://…" maxLength={2000} />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Anything worth remembering" maxLength={5000} />
      </label>

      <ListEditor
        label="Pros"
        tone="pro"
        items={form.pros}
        placeholder="Add a pro and press Enter"
        onChange={(pros) => setForm((prev) => ({ ...prev, pros }))}
      />
      <ListEditor
        label="Cons"
        tone="con"
        items={form.cons}
        placeholder="Add a con and press Enter"
        onChange={(cons) => setForm((prev) => ({ ...prev, cons }))}
      />

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Save rental' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
