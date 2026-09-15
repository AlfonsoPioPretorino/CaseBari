import { useState } from 'react'
import { Car, Footprints, Loader2, Plus } from 'lucide-react'
import { useTravelMetrics } from '../hooks/useTravelMetrics.js'
import { formatDistanceKm, formatDuration, formatMeters } from '../utils/format.js'
import { hasValidLocation, straightLineKm } from '../utils/geo.js'

function RouteValue({ travel, id }) {
  if (travel.error) return <span className="muted">unavailable</span>
  const result = travel.results[id]
  if (result === undefined) return travel.loading ? <span className="muted">calculating…</span> : <span className="muted">—</span>
  if (result === null) return <span className="muted">no route found</span>
  return (
    <span>
      {formatMeters(result.distance)} · <strong>{formatDuration(result.duration)}</strong>
    </span>
  )
}

const LINE_MODES = [
  ['off', 'Off'],
  ['straight', 'Straight'],
  ['walking', 'Walking path'],
  ['driving', 'Driving path'],
]

function PathStatus({ lineMode, pathStatus, selected }) {
  if (lineMode !== 'walking' && lineMode !== 'driving') return null
  if (pathStatus.error) {
    return (
      <div className="alert alert-warn">
        The {lineMode} path is unavailable ({pathStatus.error}). Straight lines are shown instead.
      </div>
    )
  }
  if (pathStatus.loading) {
    return (
      <p className="hint path-status">
        <Loader2 size={14} className="spin" aria-hidden="true" /> Loading {lineMode} path…
      </p>
    )
  }
  const noRoute = selected.filter((point) => pathStatus.results[point.id] === null)
  if (!noRoute.length) return null
  return (
    <div className="alert alert-warn">
      No {lineMode} route found to {noRoute.map((point) => point.name).join(', ')}. A straight line is shown instead.
    </div>
  )
}

/**
 * Distances from `origin` (a rental or a point) to the user-selected custom points.
 * Straight-line distance is always shown; route distance/time only on request.
 */
export default function DistanceSection({
  origin,
  points,
  selectedIds,
  onTogglePoint,
  lineMode,
  onLineModeChange,
  pathStatus,
  onAddPoint,
  title = 'Distances',
}) {
  const [showRoutes, setShowRoutes] = useState(false)
  const candidates = points.filter((point) => point.id !== origin.id)
  const selected = candidates.filter((point) => selectedIds.includes(point.id))
  const walking = useTravelMetrics('walking', origin, selected, showRoutes)
  const driving = useTravelMetrics('driving', origin, selected, showRoutes)
  const routeError = walking.error || driving.error
  const originValid = hasValidLocation(origin)

  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
      </div>

      {candidates.length === 0 ? (
        <div className="empty-inline">
          <p>Add your own points, like Office or University, to see how far they are.</p>
          <button type="button" className="btn btn-point btn-sm" onClick={onAddPoint}>
            <Plus size={14} /> Add a point
          </button>
        </div>
      ) : (
        <>
          <p className="hint">Choose the points to measure:</p>
          <div className="chips">
            {candidates.map((point) => {
              const active = selectedIds.includes(point.id)
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

          {!originValid && <div className="alert alert-warn">This item has an invalid location, so distances cannot be calculated.</div>}

          {selected.length > 0 && originValid && (
            <>
              <ul className="distance-list">
                {selected.map((point) => (
                  <li key={point.id}>
                    <div className="distance-main">
                      <span className="distance-name">{point.name}</span>
                      <span className="distance-value">{formatDistanceKm(straightLineKm(origin, point))}</span>
                    </div>
                    <div className="distance-kind">straight-line</div>
                    {showRoutes && (
                      <div className="route-rows">
                        <div>
                          <Footprints size={14} aria-hidden="true" /> <span className="route-label">Walking route</span>
                          <RouteValue travel={walking} id={point.id} />
                        </div>
                        <div>
                          <Car size={14} aria-hidden="true" /> <span className="route-label">Driving route</span>
                          <RouteValue travel={driving} id={point.id} />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="toggle-row">
                <label className="switch">
                  <input type="checkbox" checked={showRoutes} onChange={(event) => setShowRoutes(event.target.checked)} />
                  <span>Walking & driving routes</span>
                  {(walking.loading || driving.loading) && <Loader2 size={14} className="spin" aria-label="Calculating routes" />}
                </label>
              </div>

              <div className="map-mode">
                <span className="hint">Show on map</span>
                <div className="segmented segmented-4" role="radiogroup" aria-label="Show distances on map">
                  {LINE_MODES.map(([value, label]) => (
                    <label key={value} className={lineMode === value ? 'is-active' : ''}>
                      <input
                        type="radio"
                        name={`line-mode-${origin.id}`}
                        value={value}
                        checked={lineMode === value}
                        onChange={() => onLineModeChange(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <PathStatus lineMode={lineMode} pathStatus={pathStatus} selected={selected} />
              </div>

              {showRoutes && routeError && (
                <div className="alert alert-warn">
                  Route information is unavailable ({routeError}). Straight-line distances above are still accurate.
                </div>
              )}
              {showRoutes && !routeError && (
                <p className="fineprint">Routes from OpenStreetMap data via OSRM (FOSSGIS). Times are the service's estimates.</p>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
