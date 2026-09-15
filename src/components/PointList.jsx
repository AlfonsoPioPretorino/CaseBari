import { MapPin, Plus } from 'lucide-react'

export default function PointList({ points, loading, onOpen, onAdd }) {
  if (loading) {
    return (
      <div className="list-skeleton" aria-busy="true" aria-label="Loading points">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    )
  }

  return (
    <div className="point-list">
      <div className="list-head">
        <span className="list-count">
          {points.length} point{points.length === 1 ? '' : 's'}
        </span>
        <button type="button" className="btn btn-point btn-sm" onClick={onAdd}>
          <Plus size={14} /> Add point
        </button>
      </div>

      {points.length === 0 ? (
        <div className="empty-state">
          <MapPin size={32} aria-hidden="true" />
          <h3>Your places, your distances</h3>
          <p>
            Mark the places that matter to you, like your office, university, gym, a station or family. Then see how far
            each rental is from them.
          </p>
          <button type="button" className="btn btn-point" onClick={onAdd}>
            <Plus size={16} /> Add your first point
          </button>
        </div>
      ) : (
        <ul className="cards">
          {points.map((point) => (
            <li key={point.id} className="card">
              <button type="button" className="card-main" onClick={() => onOpen(point.id)}>
                <div className="card-top">
                  <span className="card-title">
                    <span className="point-swatch" aria-hidden="true" /> {point.name}
                  </span>
                  {point.category && <span className="fact-chip">{point.category}</span>}
                </div>
                {point.notes && <div className="card-sub clamp-2">{point.notes}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
