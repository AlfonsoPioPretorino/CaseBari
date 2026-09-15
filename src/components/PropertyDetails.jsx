import { AlertTriangle, ArrowLeft, ExternalLink, LocateFixed, Pencil, Trash2 } from 'lucide-react'
import DistanceSection from './DistanceSection.jsx'
import { formatFloor, formatRent, propertyTitle } from '../utils/format.js'
import { hasValidLocation } from '../utils/geo.js'

export default function PropertyDetails({
  property,
  points,
  distancePointIds,
  onTogglePoint,
  lineMode,
  onLineModeChange,
  pathStatus,
  compared,
  onToggleCompare,
  onBack,
  onEdit,
  onDelete,
  onZoom,
  onAddPoint,
}) {
  const rent = formatRent(property.rent)
  const floor = formatFloor(property.floor)
  const hasPros = property.pros?.length > 0
  const hasCons = property.cons?.length > 0

  return (
    <div className="details">
      <div className="details-nav">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> All rentals
        </button>
        <div className="details-nav-actions">
          {hasValidLocation(property) && (
            <button type="button" className="icon-btn" onClick={onZoom} aria-label="Show on map" title="Show on map">
              <LocateFixed size={18} />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={onEdit} aria-label="Edit rental" title="Edit">
            <Pencil size={18} />
          </button>
          <button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Delete rental" title="Delete">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <header className="details-header">
        <h2>{propertyTitle(property)}</h2>
        {property.address && property.title && <p className="details-address">{property.address}</p>}
        <div className="details-facts">
          <span className="details-rent">
            {rent ? (
              <>
                {rent}
                <small> / month</small>
              </>
            ) : (
              <span className="muted">Rent not set</span>
            )}
          </span>
          {floor && <span className="fact-chip">{floor}</span>}
        </div>
        {!hasValidLocation(property) && (
          <div className="alert alert-warn">
            <AlertTriangle size={14} /> This rental has an invalid location. Edit it and pick a spot on the map.
          </div>
        )}
        <div className="details-actions">
          {property.url && (
            <a className="btn btn-sm" href={property.url} target="_blank" rel="noopener noreferrer">
              Open listing <ExternalLink size={14} />
            </a>
          )}
          <label className="compare-check inline">
            <input type="checkbox" checked={compared} onChange={onToggleCompare} />
            <span>Add to comparison</span>
          </label>
        </div>
      </header>

      {property.notes && (
        <section className="section">
          <h3>Notes</h3>
          <p className="notes">{property.notes}</p>
        </section>
      )}

      {(hasPros || hasCons) && (
        <section className="section">
          <h3>
            Pros & cons <span className="h-sub">your evaluation</span>
          </h3>
          <div className="pros-cons">
            {hasPros && (
              <ul className="pc-list pros">
                {property.pros.map((pro, i) => (
                  <li key={i}>{pro}</li>
                ))}
              </ul>
            )}
            {hasCons && (
              <ul className="pc-list cons">
                {property.cons.map((con, i) => (
                  <li key={i}>{con}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <DistanceSection
        origin={property}
        points={points}
        selectedIds={distancePointIds}
        onTogglePoint={onTogglePoint}
        lineMode={lineMode}
        onLineModeChange={onLineModeChange}
        pathStatus={pathStatus}
        onAddPoint={onAddPoint}
      />
    </div>
  )
}
