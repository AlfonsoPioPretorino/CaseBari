import { useEffect } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { formatDistanceKm, formatFloor, formatRent, propertyTitle } from '../utils/format.js'
import { straightLineKm } from '../utils/geo.js'

// Index of the lowest numeric value, used to gently highlight the best column in a row.
function bestIndex(values) {
  let best = -1
  values.forEach((value, i) => {
    if (value != null && (best === -1 || value < values[best])) best = i
  })
  return values.filter((value) => value != null).length > 1 ? best : -1
}

export default function CompareModal({ properties, points, distancePointIds, onTogglePoint, onRemove, onOpen, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const selectedPoints = points.filter((point) => distancePointIds.includes(point.id))
  const rents = properties.map((p) => p.rent)
  const bestRent = bestIndex(rents)

  const list = (items, className) =>
    items?.length ? (
      <ul className={`pc-list ${className}`}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    ) : (
      <span className="muted">—</span>
    )

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <div className="modal-head">
          <h2 id="compare-title">Compare rentals</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close comparison">
            <X size={20} />
          </button>
        </div>

        {properties.length === 0 ? (
          <div className="empty-state compact">
            <h3>Nothing to compare yet</h3>
            <p>Tick “Compare” on two or more rentals.</p>
          </div>
        ) : (
          <>
            {points.length > 0 && (
              <div className="compare-points">
                <span className="hint">Distances to:</span>
                <div className="chips">
                  {points.map((point) => {
                    const active = distancePointIds.includes(point.id)
                    return (
                      <button
                        key={point.id}
                        type="button"
                        className={`chip chip-point${active ? ' is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => onTogglePoint(point.id)}
                      >
                        {point.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="table-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col" className="row-label" />
                    {properties.map((property) => (
                      <th scope="col" key={property.id}>
                        <div className="compare-col-head">
                          <button type="button" className="link-btn strong" onClick={() => onOpen(property.id)}>
                            {propertyTitle(property)}
                          </button>
                          <button type="button" className="icon-btn" onClick={() => onRemove(property.id)} aria-label={`Remove ${propertyTitle(property)} from comparison`}>
                            <X size={14} />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" className="row-label">Rent</th>
                    {properties.map((property, i) => (
                      <td key={property.id} className={i === bestRent ? 'is-best' : ''}>
                        {formatRent(property.rent) ?? <span className="muted">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="row-label">Floor</th>
                    {properties.map((property) => (
                      <td key={property.id}>{formatFloor(property.floor) ?? <span className="muted">—</span>}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="row-label">Address</th>
                    {properties.map((property) => (
                      <td key={property.id}>{property.address || <span className="muted">—</span>}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="row-label">Listing</th>
                    {properties.map((property) => (
                      <td key={property.id}>
                        {property.url ? (
                          <a href={property.url} target="_blank" rel="noopener noreferrer">
                            Open <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  {selectedPoints.map((point) => {
                    const distances = properties.map((property) => straightLineKm(property, point))
                    const best = bestIndex(distances)
                    return (
                      <tr key={point.id}>
                        <th scope="row" className="row-label">
                          {point.name}
                          <small>straight-line</small>
                        </th>
                        {distances.map((km, i) => (
                          <td key={properties[i].id} className={i === best ? 'is-best' : ''}>
                            {formatDistanceKm(km)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  <tr>
                    <th scope="row" className="row-label">Pros</th>
                    {properties.map((property) => (
                      <td key={property.id}>{list(property.pros, 'pros')}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="row-label">Cons</th>
                    {properties.map((property) => (
                      <td key={property.id}>{list(property.cons, 'cons')}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {properties.length === 1 && <p className="hint pad">Add at least one more rental to compare side by side.</p>}
          </>
        )}
      </div>
    </div>
  )
}
