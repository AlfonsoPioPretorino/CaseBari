import { useState } from 'react'
import { Plus, X } from 'lucide-react'

// Editable list of short strings (used for pros and cons).
export default function ListEditor({ label, items, onChange, placeholder, tone }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value) return
    onChange([...items, value])
    setDraft('')
  }

  return (
    <fieldset className={`list-editor tone-${tone}`}>
      <legend>{label}</legend>
      {items.map((item, index) => (
        <div className="list-editor-row" key={index}>
          <span className="list-editor-mark" aria-hidden="true">
            {tone === 'pro' ? '✓' : '✗'}
          </span>
          <input
            value={item}
            aria-label={`${label} ${index + 1}`}
            maxLength={300}
            onChange={(event) => onChange(items.map((entry, i) => (i === index ? event.target.value : entry)))}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label={`Remove ${item || 'entry'}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <div className="list-editor-row">
        <span className="list-editor-mark muted" aria-hidden="true">
          +
        </span>
        <input
          value={draft}
          placeholder={placeholder}
          maxLength={300}
          aria-label={`New ${label.toLowerCase()} entry`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          onBlur={add}
        />
        <button
          type="button"
          className="icon-btn"
          aria-label={`Add ${label.toLowerCase()} entry`}
          // Keep focus in the input so onBlur does not add the entry a second time.
          onMouseDown={(event) => event.preventDefault()}
          onClick={add}
        >
          <Plus size={16} />
        </button>
      </div>
    </fieldset>
  )
}
