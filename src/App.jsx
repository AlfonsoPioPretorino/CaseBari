import { useCallback, useEffect, useMemo, useState } from 'react'
import { Columns3, Crosshair, House, LogOut, MapPin, Plus, Search, X } from 'lucide-react'
import CompareModal from './components/CompareModal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import FiltersPanel from './components/FiltersPanel.jsx'
import MapView from './components/MapView.jsx'
import PlaceSearch from './components/PlaceSearch.jsx'
import PointDetails from './components/PointDetails.jsx'
import PointForm from './components/PointForm.jsx'
import PointList from './components/PointList.jsx'
import PropertyDetails from './components/PropertyDetails.jsx'
import PropertyForm from './components/PropertyForm.jsx'
import PropertyList from './components/PropertyList.jsx'
import { config } from './config.js'
import { useCollection } from './hooks/useCollection.js'
import { useRoutePaths, useTravelMetrics } from './hooks/useTravelMetrics.js'
import { pointsService, toPointPayload } from './services/points.js'
import { propertiesService, toPropertyPayload } from './services/properties.js'
import { countActiveFilters, EMPTY_FILTERS, filterProperties, getNearFilter, sortProperties } from './utils/filters.js'
import { formatDistanceKm, formatDuration, formatMeters, propertyTitle } from './utils/format.js'
import { hasValidLocation, straightLineKm } from './utils/geo.js'

const TAB_OF_VIEW = {
  list: 'list',
  property: 'list',
  propertyForm: 'list',
  points: 'points',
  point: 'points',
  pointForm: 'points',
  filters: 'filters',
}

export default function App({ user, onSignOut }) {
  const properties = useCollection(propertiesService)
  const points = useCollection(pointsService)

  // Sidebar content: list | property | propertyForm | points | point | pointForm | filters
  const [view, setView] = useState({ name: 'list' })
  // 'property' | 'point' while waiting for the user to click the map.
  const [placing, setPlacing] = useState(null)
  // Location of the rental/point being created or edited: { kind, latitude, longitude, suggestion? }
  const [draft, setDraft] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sort, setSort] = useState('rent-asc')
  const [mapBounds, setMapBounds] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const [searchResult, setSearchResult] = useState(null)
  // Session-only UI selections (distances are always calculated, never stored).
  const [distancePointIds, setDistancePointIds] = useState([])
  // What to draw between the open item and its selected points: off | straight | walking | driving
  const [lineMode, setLineMode] = useState('off')
  const [compareIds, setCompareIds] = useState([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const notify = useCallback((message, tone = 'success') => setToast({ message, tone, id: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const selectedProperty = ['property', 'propertyForm'].includes(view.name)
    ? properties.items.find((p) => p.id === view.id)
    : null
  const selectedPoint = ['point', 'pointForm'].includes(view.name) ? points.items.find((p) => p.id === view.id) : null

  // If the selected item disappears (e.g. deleted), fall back to its list.
  useEffect(() => {
    if (view.name === 'property' && properties.status === 'ready' && !selectedProperty) setView({ name: 'list' })
    if (view.name === 'point' && points.status === 'ready' && !selectedPoint) setView({ name: 'points' })
  }, [view.name, selectedProperty, selectedPoint, properties.status, points.status])

  // ---- Filtering -----------------------------------------------------------
  const near = useMemo(() => getNearFilter(filters, points.items), [filters, points.items])
  const timeBased = Boolean(near && near.metric !== 'straight')
  const travel = useTravelMetrics(timeBased ? near.metric : null, near?.point, properties.items, timeBased)
  const boundsForFilter = filters.inView ? mapBounds : null
  const filtered = useMemo(
    () => filterProperties(properties.items, filters, { near, bounds: boundsForFilter, travel }),
    [properties.items, filters, near, boundsForFilter, travel],
  )
  const effectiveSort = sort === 'distance' && !near ? 'rent-asc' : sort
  const sorted = useMemo(() => sortProperties(filtered, effectiveSort, near, travel), [filtered, effectiveSort, near, travel])
  const activeFilterCount = countActiveFilters(filters, points.items)

  const updateFilters = (next) => {
    const hadPoint = Boolean(filters.nearPointId)
    if (next.nearPointId && !hadPoint) setSort('distance')
    if (!next.nearPointId && sort === 'distance') setSort('rent-asc')
    setFilters(next)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    if (sort === 'distance') setSort('rent-asc')
  }

  // ---- Navigation ----------------------------------------------------------
  const flyTo = (item, extra = {}) => {
    if (hasValidLocation(item)) setFlyTarget({ latitude: item.latitude, longitude: item.longitude, ...extra, nonce: Date.now() })
  }

  const openView = (name) => {
    setPlacing(null)
    setDraft(null)
    setView({ name })
    setSheetOpen(true)
  }

  const openProperty = (id, { fly = false } = {}) => {
    setPlacing(null)
    setDraft(null)
    setView({ name: 'property', id })
    setSheetOpen(true)
    flyTo(properties.items.find((p) => p.id === id), { zoom: fly ? 16 : undefined, aboveSheet: true })
  }

  const openPoint = (id, { fly = false } = {}) => {
    setPlacing(null)
    setDraft(null)
    setView({ name: 'point', id })
    setSheetOpen(true)
    flyTo(points.items.find((p) => p.id === id), { zoom: fly ? 15 : undefined, aboveSheet: true })
  }

  const startPlacing = (kind) => {
    setDraft(null)
    setPlacing(kind)
    setView({ name: kind === 'property' ? 'list' : 'points' })
    setSheetOpen(false)
  }

  const handleMapClick = (location) => {
    if (placing) {
      setDraft({ kind: placing, ...location })
      setView({ name: placing === 'property' ? 'propertyForm' : 'pointForm', id: null })
      setPlacing(null)
      setSheetOpen(true)
      flyTo(location, { aboveSheet: true })
    } else if (draft) {
      setDraft((prev) => ({ ...prev, ...location }))
    }
  }

  const addAt = (kind, result) => {
    setPlacing(null)
    setSearchResult(null)
    setDraft({ kind, latitude: result.latitude, longitude: result.longitude, suggestion: result.address })
    setView({ name: kind === 'property' ? 'propertyForm' : 'pointForm', id: null })
    setSheetOpen(true)
  }

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && placing) setPlacing(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placing])

  // ---- Rentals -------------------------------------------------------------
  const editProperty = (property) => {
    setPlacing(null)
    setDraft({ kind: 'property', latitude: property.latitude, longitude: property.longitude })
    setView({ name: 'propertyForm', id: property.id })
    setSheetOpen(true)
  }

  const saveProperty = async (form) => {
    const payload = toPropertyPayload(form, draft)
    const saved = view.id ? await properties.update(view.id, payload) : await properties.create(payload)
    notify(view.id ? 'Rental updated' : 'Rental saved')
    setDraft(null)
    setView({ name: 'property', id: saved.id })
  }

  const deleteProperty = (property) =>
    setConfirm({
      title: 'Delete this rental?',
      message: `“${propertyTitle(property)}” and its notes, pros and cons will be permanently removed.`,
      onConfirm: async () => {
        await properties.remove(property.id)
        setCompareIds((ids) => ids.filter((id) => id !== property.id))
        setView({ name: 'list' })
        notify('Rental deleted')
      },
    })

  const toggleCompare = (id) =>
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]))

  // ---- Points --------------------------------------------------------------
  const editPoint = (point) => {
    setPlacing(null)
    setDraft({ kind: 'point', latitude: point.latitude, longitude: point.longitude })
    setView({ name: 'pointForm', id: point.id })
    setSheetOpen(true)
  }

  const savePoint = async (form) => {
    const payload = toPointPayload(form, draft)
    const saved = view.id ? await points.update(view.id, payload) : await points.create(payload)
    notify(view.id ? 'Point updated' : 'Point saved')
    setDraft(null)
    setView({ name: 'point', id: saved.id })
  }

  const deletePoint = (point) =>
    setConfirm({
      title: 'Delete this point?',
      message: `“${point.name}” will be removed. Your rentals are not affected.`,
      onConfirm: async () => {
        await points.remove(point.id)
        setDistancePointIds((ids) => ids.filter((id) => id !== point.id))
        setFilters((prev) => (prev.nearPointId === point.id ? { ...prev, nearPointId: '', nearMaxKm: '', nearMaxMinutes: '' } : prev))
        setSort((prev) => (prev === 'distance' ? 'rent-asc' : prev))
        setView({ name: 'points' })
        notify('Point deleted')
      },
    })

  const togglePoint = (id) =>
    setDistancePointIds((ids) => (ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]))

  const applyRadius = (point, km) => {
    updateFilters({ ...filters, nearPointId: point.id, nearMetric: 'straight', nearMaxKm: String(km), showRadius: true })
    flyTo(point, { radiusMeters: km * 1000 })
    setSheetOpen(false)
    notify(`Showing rentals within ${formatDistanceKm(km)} of ${point.name}`, 'info')
  }

  const categories = useMemo(
    () => [...new Set(points.items.map((p) => p.category).filter(Boolean))].sort(),
    [points.items],
  )

  // ---- Map layers ----------------------------------------------------------
  const formId = view.name.endsWith('Form') ? view.id : null
  const mapProperties = useMemo(() => {
    const visible = filtered.filter((p) => hasValidLocation(p) && !(view.name === 'propertyForm' && p.id === formId))
    if (view.name === 'property' && selectedProperty && hasValidLocation(selectedProperty) && !visible.includes(selectedProperty)) {
      visible.push(selectedProperty)
    }
    return visible
  }, [filtered, view.name, formId, selectedProperty])

  const mapPoints = useMemo(
    () => points.items.filter((p) => hasValidLocation(p) && !(view.name === 'pointForm' && p.id === formId)),
    [points.items, view.name, formId],
  )

  const lineOrigin = view.name === 'property' ? selectedProperty : view.name === 'point' ? selectedPoint : null
  const lineTargets = useMemo(
    () =>
      lineOrigin
        ? points.items.filter((p) => distancePointIds.includes(p.id) && p.id !== lineOrigin.id && hasValidLocation(p))
        : [],
    [lineOrigin, points.items, distancePointIds],
  )
  const pathProfile = lineMode === 'walking' || lineMode === 'driving' ? lineMode : null
  const routePaths = useRoutePaths(pathProfile, lineOrigin, lineTargets, Boolean(pathProfile))

  const lines = useMemo(() => {
    if (lineMode === 'off' || !hasValidLocation(lineOrigin)) return []
    return lineTargets.map((p) => {
      const id = `${lineOrigin.id}-${p.id}`
      const path = pathProfile ? routePaths.results[p.id] : null
      if (path) {
        return {
          id,
          kind: pathProfile,
          positions: path.coordinates,
          label: `${p.name} · ${formatMeters(path.distance)} · ${formatDuration(path.duration)}`,
        }
      }
      // Straight line when chosen, or while a path is loading / unavailable (labelled as such).
      return {
        id,
        kind: 'straight',
        positions: [
          [lineOrigin.latitude, lineOrigin.longitude],
          [p.latitude, p.longitude],
        ],
        label: `${p.name} · ${formatDistanceKm(straightLineKm(lineOrigin, p))} straight`,
      }
    })
  }, [lineMode, pathProfile, lineOrigin, lineTargets, routePaths])

  const radius =
    near?.metric === 'straight' && filters.showRadius && hasValidLocation(near.point)
      ? { center: [near.point.latitude, near.point.longitude], meters: near.maxKm * 1000 }
      : null

  // ---- Render --------------------------------------------------------------
  const loadError = properties.error || points.error
  const tab = TAB_OF_VIEW[view.name]
  const comparedProperties = compareIds.map((id) => properties.items.find((p) => p.id === id)).filter(Boolean)

  let panel
  if (view.name === 'property' && selectedProperty) {
    panel = (
      <PropertyDetails
        key={selectedProperty.id}
        property={selectedProperty}
        points={points.items}
        distancePointIds={distancePointIds}
        onTogglePoint={togglePoint}
        lineMode={lineMode}
        onLineModeChange={setLineMode}
        pathStatus={routePaths}
        compared={compareIds.includes(selectedProperty.id)}
        onToggleCompare={() => toggleCompare(selectedProperty.id)}
        onBack={() => openView('list')}
        onEdit={() => editProperty(selectedProperty)}
        onDelete={() => deleteProperty(selectedProperty)}
        onZoom={() => {
          flyTo(selectedProperty, { zoom: 17 })
          setSheetOpen(false)
        }}
        onAddPoint={() => startPlacing('point')}
      />
    )
  } else if (view.name === 'propertyForm') {
    panel = (
      <PropertyForm
        key={view.id || 'new'}
        property={view.id ? selectedProperty : null}
        location={draft}
        suggestedAddress={draft?.suggestion}
        onSave={saveProperty}
        onCancel={() => (view.id ? openProperty(view.id) : openView('list'))}
      />
    )
  } else if (view.name === 'point' && selectedPoint) {
    panel = (
      <PointDetails
        key={selectedPoint.id}
        point={selectedPoint}
        points={points.items}
        properties={properties.items}
        filters={filters}
        distancePointIds={distancePointIds}
        onTogglePoint={togglePoint}
        lineMode={lineMode}
        onLineModeChange={setLineMode}
        pathStatus={routePaths}
        onBack={() => openView('points')}
        onEdit={() => editPoint(selectedPoint)}
        onDelete={() => deletePoint(selectedPoint)}
        onZoom={() => {
          flyTo(selectedPoint, { zoom: 16 })
          setSheetOpen(false)
        }}
        onOpenProperty={(id) => openProperty(id, { fly: true })}
        onApplyRadius={(km) => applyRadius(selectedPoint, km)}
        onClearRadius={() => updateFilters({ ...filters, nearPointId: '', nearMaxKm: '' })}
        onAddPoint={() => startPlacing('point')}
      />
    )
  } else if (view.name === 'pointForm') {
    panel = (
      <PointForm
        key={view.id || 'new'}
        point={view.id ? selectedPoint : null}
        location={draft}
        suggestedName={draft?.suggestion}
        categories={categories}
        onSave={savePoint}
        onCancel={() => (view.id ? openPoint(view.id) : openView('points'))}
      />
    )
  } else if (view.name === 'points') {
    panel = (
      <PointList
        points={points.items}
        loading={points.status === 'loading'}
        onOpen={(id) => openPoint(id, { fly: true })}
        onAdd={() => startPlacing('point')}
      />
    )
  } else if (view.name === 'filters') {
    panel = (
      <FiltersPanel
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        points={points.items}
        activeCount={activeFilterCount}
        resultCount={filtered.length}
        travel={travel}
        near={near}
      />
    )
  } else {
    panel = (
      <PropertyList
        properties={sorted}
        totalCount={properties.items.length}
        loading={properties.status === 'loading'}
        sort={effectiveSort}
        onSortChange={setSort}
        near={near}
        travel={travel}
        activeFilterCount={activeFilterCount}
        hasQuery={Boolean(filters.query.trim())}
        compareIds={compareIds}
        onToggleCompare={toggleCompare}
        onOpen={(id) => openProperty(id, { fly: true })}
        onAdd={() => startPlacing('property')}
        onClearFilters={clearFilters}
      />
    )
  }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand" title={`${config.appName} · ${config.cityName}`}>
          <span className="brand-mark">
            <House size={18} />
          </span>
          <span className="brand-text">
            <strong>{config.appName}</strong>
            <small>{config.cityName}</small>
          </span>
        </div>

        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={filters.query}
            placeholder="Search rentals"
            aria-label="Search rentals by name, address, notes, pros or cons"
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, query: event.target.value }))
              if (!view.name.endsWith('Form') && view.name !== 'list') setView({ name: 'list' })
              setSheetOpen(true)
            }}
          />
          {filters.query && (
            <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => setFilters((prev) => ({ ...prev, query: '' }))}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className={`btn btn-primary toolbar-btn${placing === 'property' ? ' is-pressed' : ''}`}
            onClick={() => (placing === 'property' ? setPlacing(null) : startPlacing('property'))}
            title="Add a rental by clicking the map"
          >
            <Plus size={16} />
            <span className="btn-label">Rental</span>
          </button>
          <button
            type="button"
            className={`btn btn-point toolbar-btn${placing === 'point' ? ' is-pressed' : ''}`}
            onClick={() => (placing === 'point' ? setPlacing(null) : startPlacing('point'))}
            title="Add one of your points (office, gym…) by clicking the map"
          >
            <MapPin size={16} />
            <span className="btn-label">Point</span>
          </button>
          <button
            type="button"
            className="btn toolbar-btn"
            onClick={() => setCompareOpen(true)}
            disabled={compareIds.length === 0}
            title={compareIds.length ? 'Compare selected rentals' : 'Tick “Compare” on rentals to compare them'}
          >
            <Columns3 size={16} />
            <span className="btn-label">Compare</span>
            {compareIds.length > 0 && <span className="badge">{compareIds.length}</span>}
          </button>
          <button type="button" className="btn toolbar-btn" onClick={onSignOut} title={`Signed in as ${user.email}. Sign out`}>
            <LogOut size={16} />
            <span className="btn-label">Sign out</span>
          </button>
        </div>
      </header>

      <main className="main">
        <div className="map-area">
          <MapView
            properties={mapProperties}
            points={mapPoints}
            selectedPropertyId={selectedProperty?.id}
            selectedPointId={selectedPoint?.id}
            draft={draft}
            placing={placing}
            lines={lines}
            radius={radius}
            flyTarget={flyTarget}
            searchResult={searchResult}
            onMapClick={handleMapClick}
            onBoundsChange={setMapBounds}
            onDraftMove={(location) => setDraft((prev) => ({ ...prev, ...location }))}
            onOpenProperty={(id) => openProperty(id)}
            onOpenPoint={(id) => openPoint(id)}
            onAddAt={addAt}
            onDismissSearch={() => setSearchResult(null)}
          />

          <div className="map-overlay-top">
            <PlaceSearch
              onSelect={(result) => {
                setSearchResult(result)
                flyTo(result, { zoom: 17 })
              }}
            />
            {placing && (
              <div className="placing-banner" role="status">
                <Crosshair size={16} aria-hidden="true" />
                <span>Click on the map to place the new {placing === 'property' ? 'rental' : 'point'}</span>
                <button type="button" className="btn btn-sm" onClick={() => setPlacing(null)}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {loadError && (
            <div className="load-error" role="alert">
              <span>Could not load your data: {loadError}</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  properties.load()
                  points.load()
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <aside className={`sidebar${sheetOpen ? ' is-open' : ''}`} aria-label="Details panel">
          <button
            type="button"
            className="sheet-handle"
            onClick={() => setSheetOpen((open) => !open)}
            aria-label={sheetOpen ? 'Collapse panel' : 'Expand panel'}
            aria-expanded={sheetOpen}
          >
            <span />
          </button>
          <nav className="tabs" aria-label="Panels">
            <button type="button" className={tab === 'list' ? 'is-active' : ''} onClick={() => openView('list')}>
              Rentals <span className="tab-count">{properties.items.length}</span>
            </button>
            <button type="button" className={tab === 'points' ? 'is-active' : ''} onClick={() => openView('points')}>
              My points <span className="tab-count">{points.items.length}</span>
            </button>
            <button type="button" className={tab === 'filters' ? 'is-active' : ''} onClick={() => openView('filters')}>
              Filters {activeFilterCount > 0 && <span className="tab-count is-accent">{activeFilterCount}</span>}
            </button>
          </nav>
          <div className="sidebar-body">{panel}</div>
        </aside>
      </main>

      {compareOpen && (
        <CompareModal
          properties={comparedProperties}
          points={points.items}
          distancePointIds={distancePointIds}
          onTogglePoint={togglePoint}
          onRemove={toggleCompare}
          onOpen={(id) => {
            setCompareOpen(false)
            openProperty(id, { fly: true })
          }}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}

      {toast && (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  )
}
