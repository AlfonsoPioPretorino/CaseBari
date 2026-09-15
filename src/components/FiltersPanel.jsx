export default function FiltersPanel({ filters, onChange, onClear, points, activeCount, resultCount, travel, near }) {
  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    onChange({ ...filters, [field]: value })
  }
  const timeBased = filters.nearMetric !== 'straight'

  return (
    <div className="form filters">
      <div className="filters-head">
        <h2>Filters</h2>
        <button type="button" className="link-btn" onClick={onClear} disabled={activeCount === 0 && !filters.query}>
          Clear all
        </button>
      </div>
      <p className="hint">
        {resultCount} rental{resultCount === 1 ? '' : 's'} shown
      </p>

      <fieldset className="filter-group">
        <legend>Monthly rent</legend>
        <div className="field-row">
          <label className="field">
            <span>Min</span>
            <input type="number" min="0" step="50" inputMode="decimal" value={filters.rentMin} onChange={set('rentMin')} placeholder="Any" />
          </label>
          <label className="field">
            <span>Max</span>
            <input type="number" min="0" step="50" inputMode="decimal" value={filters.rentMax} onChange={set('rentMax')} placeholder="Any" />
          </label>
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Floor</legend>
        <div className="field-row">
          <label className="field">
            <span>From</span>
            <input type="number" step="1" inputMode="numeric" value={filters.floorMin} onChange={set('floorMin')} placeholder="Any" />
          </label>
          <label className="field">
            <span>To</span>
            <input type="number" step="1" inputMode="numeric" value={filters.floorMax} onChange={set('floorMax')} placeholder="Any" />
          </label>
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Location / neighborhood</legend>
        <label className="field">
          <span className="sr-only">Address or neighborhood contains</span>
          <input value={filters.location} onChange={set('location')} placeholder="e.g. Poggiofranco, Via Sparano" />
        </label>
        <label className="switch">
          <input type="checkbox" checked={filters.inView} onChange={set('inView')} />
          <span>Only rentals in the visible map area</span>
        </label>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Distance from one of my points</legend>
        {points.length === 0 ? (
          <p className="hint">Add a point, like your office, to filter by distance.</p>
        ) : (
          <>
            <label className="field">
              <span>Point</span>
              <select value={filters.nearPointId} onChange={set('nearPointId')}>
                <option value="">No distance filter</option>
                {points.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name}
                  </option>
                ))}
              </select>
            </label>

            {filters.nearPointId && (
              <>
                <div className="segmented" role="radiogroup" aria-label="Distance type">
                  {[
                    ['straight', 'Straight-line'],
                    ['walking', 'Walking time'],
                    ['driving', 'Driving time'],
                  ].map(([value, label]) => (
                    <label key={value} className={filters.nearMetric === value ? 'is-active' : ''}>
                      <input type="radio" name="nearMetric" value={value} checked={filters.nearMetric === value} onChange={set('nearMetric')} />
                      {label}
                    </label>
                  ))}
                </div>

                {timeBased ? (
                  <label className="field">
                    <span>Maximum {filters.nearMetric === 'walking' ? 'walking' : 'driving'} time</span>
                    <div className="input-unit">
                      <input type="number" min="1" step="5" value={filters.nearMaxMinutes} onChange={set('nearMaxMinutes')} placeholder="30" />
                      <span className="unit">min</span>
                    </div>
                  </label>
                ) : (
                  <>
                    <label className="field">
                      <span>Maximum distance</span>
                      <div className="input-unit">
                        <input type="number" min="0.1" step="0.5" value={filters.nearMaxKm} onChange={set('nearMaxKm')} placeholder="5" />
                        <span className="unit">km</span>
                      </div>
                    </label>
                    <label className="switch">
                      <input type="checkbox" checked={filters.showRadius} onChange={set('showRadius')} />
                      <span>Show radius on map</span>
                    </label>
                  </>
                )}

                {near && timeBased && travel.loading && <div className="alert alert-info">Calculating travel times…</div>}
                {near && timeBased && travel.error && (
                  <div className="alert alert-warn">
                    Routing is unavailable ({travel.error}). The time filter is not applied. Use straight-line distance instead.
                  </div>
                )}
                <p className="fineprint">
                  {timeBased
                    ? 'Travel times are estimates from OSRM (FOSSGIS). Rentals with no route are hidden.'
                    : 'Straight-line distance, as the crow flies.'}
                </p>
              </>
            )}
          </>
        )}
      </fieldset>
    </div>
  )
}
