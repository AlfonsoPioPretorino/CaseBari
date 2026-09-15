import { AlertTriangle, House, Plus } from 'lucide-react'
import { SORT_OPTIONS } from '../utils/filters.js'
import { formatDistanceKm, formatDuration, formatFloor, formatRent, propertyTitle } from '../utils/format.js'
import { hasValidLocation, straightLineKm } from '../utils/geo.js'

function nearLabel(property, near, travel) {
  if (!near) return null
  if (near.metric === 'straight') return `${formatDistanceKm(straightLineKm(property, near.point))} from ${near.point.name}`
  const result = travel.results[property.id]
  if (!result) return null
  return `${formatDuration(result.duration)} ${near.metric === 'walking' ? 'walk' : 'drive'} to ${near.point.name}`
}

export default function PropertyList({
  properties,
  totalCount,
  loading,
  sort,
  onSortChange,
  near,
  travel,
  activeFilterCount,
  hasQuery,
  compareIds,
  onToggleCompare,
  onOpen,
  onAdd,
  onClearFilters,
}) {
  if (loading) {
    return (
      <div className="list-skeleton" aria-busy="true" aria-label="Loading rentals">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="empty-state">
        <House size={32} aria-hidden="true" />
        <h3>No rentals yet</h3>
        <p>Add the first place you are considering. Pick its location on the map, then fill in only what you know.</p>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          <Plus size={16} /> Add rental
        </button>
      </div>
    )
  }

  const sortOptions = SORT_OPTIONS.filter((option) => option.value !== 'distance' || near)

  return (
    <div className="property-list">
      <div className="list-head">
        <span className="list-count">
          {properties.length === totalCount ? `${totalCount} rental${totalCount === 1 ? '' : 's'}` : `${properties.length} of ${totalCount} rentals`}
        </span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value)} aria-label="Sort rentals">
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {near && near.metric !== 'straight' && travel.loading && <div className="alert alert-info">Calculating travel times…</div>}
      {near && near.metric !== 'straight' && travel.error && (
        <div className="alert alert-warn">
          Travel times are unavailable ({travel.error}), so the time filter is not applied. Try a straight-line distance instead.
        </div>
      )}

      {properties.length === 0 ? (
        <div className="empty-state compact">
          <h3>No rentals match</h3>
          <p>{hasQuery || activeFilterCount ? 'Try a different search or loosen your filters.' : ''}</p>
          <button type="button" className="btn" onClick={onClearFilters}>
            Clear search & filters
          </button>
        </div>
      ) : (
        <ul className="cards">
          {properties.map((property) => {
            const floor = formatFloor(property.floor)
            const rent = formatRent(property.rent)
            const distance = nearLabel(property, near, travel)
            const compared = compareIds.includes(property.id)
            return (
              <li key={property.id} className="card">
                <button type="button" className="card-main" onClick={() => onOpen(property.id)}>
                  <div className="card-top">
                    <span className="card-title">{propertyTitle(property)}</span>
                    <span className={`rent-badge${rent ? '' : ' is-empty'}`}>{rent ?? 'No rent'}</span>
                  </div>
                  {property.address && property.title && <div className="card-sub">{property.address}</div>}
                  <div className="card-meta">
                    {floor && <span>{floor}</span>}
                    {property.pros?.length > 0 && <span className="pro-count">✓ {property.pros.length}</span>}
                    {property.cons?.length > 0 && <span className="con-count">✗ {property.cons.length}</span>}
                    {distance && <span className="near-label">{distance}</span>}
                    {!hasValidLocation(property) && (
                      <span className="warn-label">
                        <AlertTriangle size={12} /> Invalid location
                      </span>
                    )}
                  </div>
                </button>
                <label className="compare-check" title="Add to comparison">
                  <input type="checkbox" checked={compared} onChange={() => onToggleCompare(property.id)} />
                  <span>Compare</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
