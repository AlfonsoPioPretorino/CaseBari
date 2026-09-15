import { useState } from 'react'
import { ArrowLeft, LocateFixed, Pencil, Trash2 } from 'lucide-react'
import DistanceSection from './DistanceSection.jsx'
import { useTravelMetrics } from '../hooks/useTravelMetrics.js'
import { formatDistanceKm, formatDuration, formatMeters, formatRent, propertyTitle } from '../utils/format.js'
import { hasValidLocation, straightLineKm } from '../utils/geo.js'

const RENTALS_PREVIEW = 8

function RentalsFromPoint({ point, properties, onOpenProperty }) {
  const [metric, setMetric] = useState('straight')
  const [showAll, setShowAll] = useState(false)
  const located = properties.filter(hasValidLocation)
  const travel = useTravelMetrics(metric === 'straight' ? null : metric, point, located, metric !== 'straight')

  const rows = located
    .map((property) => ({
      property,
      km: straightLineKm(point, property),
      route: travel.results[property.id],
    }))
    .sort((a, b) => {
      if (metric !== 'straight' && !travel.error) {
        const da = a.route?.duration ?? Infinity
        const db = b.route?.duration ?? Infinity
        if (da !== db) return da - db
      }
      return a.km - b.km
    })
  const visible = showAll ? rows : rows.slice(0, RENTALS_PREVIEW)

  return (
    <section className="section">
      <div className="section-head">
        <h3>Rentals from {point.name}</h3>
        <select value={metric} onChange={(event) => setMetric(event.target.value)} aria-label="Distance type">
          <option value="straight">Straight-line</option>
          <option value="walking">Walking route</option>
          <option value="driving">Driving route</option>
        </select>
      </div>

      {located.length === 0 ? (
        <p className="hint">No rentals on the map yet.</p>
      ) : (
        <>
          {metric !== 'straight' && travel.loading && <div className="alert alert-info">Calculating routes…</div>}
          {metric !== 'straight' && travel.error && (
            <div className="alert alert-warn">Routes unavailable ({travel.error}). Showing straight-line distances.</div>
          )}
          <ul className="rank-list">
            {visible.map(({ property, km, route }) => (
              <li key={property.id}>
                <button type="button" onClick={() => onOpenProperty(property.id)}>
                  <span className="rank-name">
                    {propertyTitle(property)}
                    {property.rent != null && <small>{formatRent(property.rent)}</small>}
                  </span>
                  <span className="rank-value">
                    {metric === 'straight' || travel.error ? (
                      formatDistanceKm(km)
                    ) : route ? (
                      <>
                        <strong>{formatDuration(route.duration)}</strong> <small>{formatMeters(route.distance)}</small>
                      </>
                    ) : route === null ? (
                      <small className="muted">no route</small>
                    ) : (
                      <small className="muted">…</small>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {rows.length > RENTALS_PREVIEW && (
            <button type="button" className="link-btn" onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Show fewer' : `Show all ${rows.length}`}
            </button>
          )}
          <p className="fineprint">
            {metric === 'straight' ? 'Straight-line distance (as the crow flies).' : 'Route estimates from OSRM (FOSSGIS).'}
          </p>
        </>
      )}
    </section>
  )
}

function RadiusSearch({ point, filters, onApplyRadius, onClearRadius }) {
  const active = filters.nearPointId === point.id && filters.nearMetric === 'straight' && Number(filters.nearMaxKm) > 0
  const [km, setKm] = useState(active ? String(filters.nearMaxKm) : '2')
  const valid = Number(km) > 0

  return (
    <section className="section">
      <h3>Radius search</h3>
      <p className="hint">Show only rentals within a straight-line distance of {point.name}.</p>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid) onApplyRadius(Number(km))
        }}
      >
        <label className="field compact">
          <span className="sr-only">Radius in km</span>
          <input type="number" min="0.1" step="0.5" value={km} onChange={(event) => setKm(event.target.value)} />
          <span className="unit">km</span>
        </label>
        <button type="submit" className="btn btn-point btn-sm" disabled={!valid}>
          {active ? 'Update radius' : 'Show rentals within'}
        </button>
        {active && (
          <button type="button" className="btn btn-sm" onClick={onClearRadius}>
            Clear
          </button>
        )}
      </form>
      {active && <div className="alert alert-info">Radius filter active: {formatDistanceKm(Number(filters.nearMaxKm))} around {point.name}.</div>}
    </section>
  )
}

export default function PointDetails({
  point,
  points,
  properties,
  filters,
  distancePointIds,
  onTogglePoint,
  lineMode,
  onLineModeChange,
  pathStatus,
  onBack,
  onEdit,
  onDelete,
  onZoom,
  onOpenProperty,
  onApplyRadius,
  onClearRadius,
  onAddPoint,
}) {
  return (
    <div className="details">
      <div className="details-nav">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> My points
        </button>
        <div className="details-nav-actions">
          <button type="button" className="icon-btn" onClick={onZoom} aria-label="Show on map" title="Show on map">
            <LocateFixed size={18} />
          </button>
          <button type="button" className="icon-btn" onClick={onEdit} aria-label="Edit or move point" title="Edit / move">
            <Pencil size={18} />
          </button>
          <button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Delete point" title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <header className="details-header">
        <div className="popup-kicker popup-kicker-point">My point</div>
        <h2>{point.name}</h2>
        <div className="details-facts">
          {point.category && <span className="fact-chip">{point.category}</span>}
          <button type="button" className="link-btn" onClick={onEdit}>
            Move or edit
          </button>
        </div>
        {point.notes && <p className="notes">{point.notes}</p>}
      </header>

      {!hasValidLocation(point) ? (
        <div className="alert alert-warn">This point has an invalid location. Edit it and pick a spot on the map.</div>
      ) : (
        <>
          <RentalsFromPoint point={point} properties={properties} onOpenProperty={onOpenProperty} />
          <RadiusSearch
            key={point.id}
            point={point}
            filters={filters}
            onApplyRadius={onApplyRadius}
            onClearRadius={onClearRadius}
          />
          <DistanceSection
            title="Distance to other points"
            origin={point}
            points={points}
            selectedIds={distancePointIds}
            onTogglePoint={onTogglePoint}
            lineMode={lineMode}
            onLineModeChange={onLineModeChange}
            pathStatus={pathStatus}
            onAddPoint={onAddPoint}
          />
        </>
      )}
    </div>
  )
}
