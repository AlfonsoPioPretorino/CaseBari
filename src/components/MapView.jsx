import { Fragment, useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet'
import { config } from '../config.js'
import { escapeHtml, formatFloor, formatRent, formatRentShort, propertyTitle } from '../utils/format.js'
import { hasValidLocation } from '../utils/geo.js'

const ATTRIBUTION = `${config.tileAttribution} · Routes <a href="https://routing.openstreetmap.de/about.html">FOSSGIS OSRM</a> · Search <a href="https://nominatim.org/">Nominatim</a>`

const toLatLng = (item) => [item.latitude, item.longitude]

const LINE_STYLES = {
  straight: { color: '#c2410c', weight: 3, opacity: 0.85, dashArray: '8 8' },
  walking: { color: '#0f766e', weight: 5, opacity: 0.9, lineJoin: 'round' },
  driving: { color: '#7c3aed', weight: 5, opacity: 0.9, lineJoin: 'round' },
}
const PATH_CASING = { color: '#ffffff', weight: 9, opacity: 0.85, lineJoin: 'round' }

function rentalIcon(rent, selected) {
  return L.divIcon({
    className: 'marker-host',
    iconSize: null,
    popupAnchor: [0, -36],
    html: `<div class="rental-marker${selected ? ' is-selected' : ''}">${escapeHtml(formatRentShort(rent))}</div>`,
  })
}

function pointIcon(name, selected) {
  return L.divIcon({
    className: 'marker-host',
    iconSize: null,
    popupAnchor: [0, -12],
    html: `<div class="point-marker${selected ? ' is-selected' : ''}"><span class="point-dot"></span><span class="point-label">${escapeHtml(name)}</span></div>`,
  })
}

function draftIcon(kind) {
  return L.divIcon({
    className: 'marker-host',
    iconSize: null,
    html: `<div class="draft-marker draft-${kind}"><span></span></div>`,
  })
}

function boundsOf(map) {
  const b = map.getBounds()
  return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }
}

function MapEvents({ onClick, onBoundsChange }) {
  const map = useMapEvents({
    click: (event) => onClick({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
    moveend: () => onBoundsChange(boundsOf(map)),
  })
  useEffect(() => {
    onBoundsChange(boundsOf(map))
    // Report the initial viewport once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

// Distance label at the middle of a line or path. Managed directly so it is always removed with its line.
function LineLabel({ positions, label, kind }) {
  const map = useMap()
  useEffect(() => {
    const center = L.LineUtil.polylineCenter(positions.map((position) => L.latLng(position)), map.options.crs)
    const tooltip = L.tooltip({ permanent: true, direction: 'center', className: `distance-tooltip tooltip-${kind}` })
      .setLatLng(center)
      .setContent(escapeHtml(label))
      .addTo(map)
    return () => tooltip.remove()
  }, [map, positions, label, kind])
  return null
}

// When the drawn lines/paths change, zoom out just enough to show them if they are not already visible.
function FitLines({ lines }) {
  const map = useMap()
  const fitKey = lines.map((line) => `${line.id}:${line.kind}`).join('|')
  useEffect(() => {
    if (!lines.length) return
    const bounds = L.latLngBounds(lines.flatMap((line) => line.positions))
    if (map.getBounds().contains(bounds)) return
    const mobile = window.matchMedia('(max-width: 760px)').matches
    // On mobile, keep the lines above the bottom sheet.
    const bottom = mobile ? Math.round(map.getSize().y * 0.64) : 40
    map.flyToBounds(bounds, { paddingTopLeft: [40, 70], paddingBottomRight: [40, bottom], duration: 0.6 })
    // Refit only when the set of lines changes, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map])
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (!target || !hasValidLocation(target)) return
    if (target.radiusMeters) {
      const bounds = L.latLng(toLatLng(target)).toBounds(target.radiusMeters * 2)
      map.flyToBounds(bounds, { padding: [24, 24], duration: 0.6 })
    } else {
      const mobile = window.matchMedia('(max-width: 760px)').matches
      // Without a zoom change, only move the map when the mobile sheet would hide the item.
      if (!target.zoom && !(target.aboveSheet && mobile)) return
      const zoom = target.zoom ? Math.max(map.getZoom(), target.zoom) : map.getZoom()
      let center = L.latLng(toLatLng(target))
      // On mobile the bottom sheet covers the lower part of the map: keep the item above it.
      if (target.aboveSheet && mobile) {
        center = map.unproject(map.project(center, zoom).add([0, map.getSize().y * 0.3]), zoom)
      }
      map.flyTo(center, zoom, { duration: 0.6 })
    }
  }, [target, map])
  return null
}

function RentalMarker({ property, selected, onOpen }) {
  const map = useMap()
  const icon = useMemo(() => rentalIcon(property.rent, selected), [property.rent, selected])
  const floor = formatFloor(property.floor)
  return (
    <Marker position={toLatLng(property)} icon={icon} zIndexOffset={selected ? 1000 : 0} title={propertyTitle(property)}>
      <Popup autoPanPadding={[24, 80]}>
        <div className="popup">
          <div className="popup-kicker">Rental</div>
          <div className="popup-title">{propertyTitle(property)}</div>
          {property.address && property.title && <div className="popup-sub">{property.address}</div>}
          <div className="popup-meta">
            <strong>{formatRent(property.rent) ? `${formatRent(property.rent)} / month` : 'Rent not set'}</strong>
            {floor && <span>{floor}</span>}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            onClick={() => {
              map.closePopup()
              onOpen(property.id)
            }}
          >
            View details
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

function PointMarker({ point, selected, onOpen }) {
  const map = useMap()
  const icon = useMemo(() => pointIcon(point.name, selected), [point.name, selected])
  return (
    <Marker position={toLatLng(point)} icon={icon} zIndexOffset={selected ? 900 : -100} title={point.name}>
      <Popup autoPanPadding={[24, 80]}>
        <div className="popup">
          <div className="popup-kicker popup-kicker-point">My point{point.category ? ` · ${point.category}` : ''}</div>
          <div className="popup-title">{point.name}</div>
          {point.notes && <div className="popup-sub clamp-2">{point.notes}</div>}
          <button
            type="button"
            className="btn btn-point btn-sm btn-block"
            onClick={() => {
              map.closePopup()
              onOpen(point.id)
            }}
          >
            Distances & details
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

function SearchResultMarker({ result, onAdd, onDismiss }) {
  const map = useMap()
  const markerRef = useRef(null)
  const add = (kind) => {
    map.closePopup()
    onAdd(kind, result)
  }
  useEffect(() => {
    markerRef.current?.openPopup()
  }, [result])
  return (
    <Marker ref={markerRef} position={toLatLng(result)} icon={draftIcon('search')}>
      <Popup autoPanPadding={[24, 80]}>
        <div className="popup">
          <div className="popup-kicker">Search result</div>
          <div className="popup-title clamp-2">{result.label}</div>
          <div className="popup-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => add('property')}>
              Add rental here
            </button>
            <button type="button" className="btn btn-point btn-sm" onClick={() => add('point')}>
              Add point here
            </button>
          </div>
          <button type="button" className="link-btn" onClick={onDismiss}>
            Remove pin
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

export default function MapView({
  properties,
  points,
  selectedPropertyId,
  selectedPointId,
  draft,
  placing,
  lines,
  radius,
  flyTarget,
  searchResult,
  onMapClick,
  onBoundsChange,
  onDraftMove,
  onOpenProperty,
  onOpenPoint,
  onAddAt,
  onDismissSearch,
}) {
  return (
    <div className={`map-shell${placing || draft ? ' is-placing' : ''}`}>
      <MapContainer
        center={config.cityCenter}
        zoom={config.cityZoom}
        maxZoom={config.tileMaxZoom}
        zoomControl={false}
        className="map"
      >
        <TileLayer url={config.tileUrl} attribution={ATTRIBUTION} maxZoom={config.tileMaxZoom} />
        <ZoomControl position="topright" />
        <MapEvents onClick={onMapClick} onBoundsChange={onBoundsChange} />
        <FlyTo target={flyTarget} />
        <FitLines lines={lines} />

        {radius && (
          <Circle
            center={radius.center}
            radius={radius.meters}
            pathOptions={{ color: '#ea580c', weight: 2, fillColor: '#f97316', fillOpacity: 0.08, dashArray: '6 6' }}
            interactive={false}
          />
        )}

        {lines.map((line) => (
          <Fragment key={`${line.id}-${line.kind}`}>
            {/* White casing keeps street paths readable over busy map tiles. */}
            {line.kind !== 'straight' && <Polyline positions={line.positions} pathOptions={PATH_CASING} interactive={false} />}
            <Polyline positions={line.positions} pathOptions={LINE_STYLES[line.kind]} interactive={false} />
            <LineLabel positions={line.positions} label={line.label} kind={line.kind} />
          </Fragment>
        ))}

        {points.map((point) => (
          <PointMarker key={point.id} point={point} selected={point.id === selectedPointId} onOpen={onOpenPoint} />
        ))}

        {properties.map((property) => (
          <RentalMarker
            key={property.id}
            property={property}
            selected={property.id === selectedPropertyId}
            onOpen={onOpenProperty}
          />
        ))}

        {searchResult && <SearchResultMarker result={searchResult} onAdd={onAddAt} onDismiss={onDismissSearch} />}

        {draft && hasValidLocation(draft) && (
          <Marker
            position={toLatLng(draft)}
            icon={draftIcon(draft.kind)}
            draggable
            zIndexOffset={2000}
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng()
                onDraftMove({ latitude: lat, longitude: lng })
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}

