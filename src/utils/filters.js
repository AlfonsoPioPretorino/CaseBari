import { isInBounds, straightLineKm } from './geo.js'

export const EMPTY_FILTERS = {
  query: '',
  rentMin: '',
  rentMax: '',
  floorMin: '',
  floorMax: '',
  location: '',
  inView: false,
  nearPointId: '',
  nearMetric: 'straight', // straight | walking | driving
  nearMaxKm: '',
  nearMaxMinutes: '',
  showRadius: true,
}

const toNumber = (value) => (value === '' || value == null || !Number.isFinite(Number(value)) ? null : Number(value))

/** The distance filter, if fully configured: { point, metric, maxKm | maxMinutes }. */
export function getNearFilter(filters, points) {
  const point = points.find((p) => p.id === filters.nearPointId)
  if (!point) return null
  if (filters.nearMetric === 'straight') {
    const maxKm = toNumber(filters.nearMaxKm)
    return maxKm > 0 ? { point, metric: 'straight', maxKm } : null
  }
  const maxMinutes = toNumber(filters.nearMaxMinutes)
  return maxMinutes > 0 ? { point, metric: filters.nearMetric, maxMinutes } : null
}

export function countActiveFilters(filters, points) {
  return [
    filters.rentMin !== '' || filters.rentMax !== '',
    filters.floorMin !== '' || filters.floorMax !== '',
    filters.location.trim() !== '',
    filters.inView,
    Boolean(getNearFilter(filters, points)),
  ].filter(Boolean).length
}

/**
 * ctx: { near, bounds, travel } where travel is the useTravelMetrics result for time-based near filters.
 */
export function filterProperties(properties, filters, { near, bounds, travel }) {
  const query = filters.query.trim().toLowerCase()
  const location = filters.location.trim().toLowerCase()
  const rentMin = toNumber(filters.rentMin)
  const rentMax = toNumber(filters.rentMax)
  const floorMin = toNumber(filters.floorMin)
  const floorMax = toNumber(filters.floorMax)
  const includes = (value, needle) => typeof value === 'string' && value.toLowerCase().includes(needle)

  return properties.filter((p) => {
    if (query) {
      const haystack = [p.title, p.address, p.notes, p.url, ...(p.pros || []), ...(p.cons || [])]
      if (!haystack.some((value) => includes(value, query))) return false
    }
    if (rentMin != null && (p.rent == null || p.rent < rentMin)) return false
    if (rentMax != null && (p.rent == null || p.rent > rentMax)) return false
    if (floorMin != null && (p.floor == null || p.floor < floorMin)) return false
    if (floorMax != null && (p.floor == null || p.floor > floorMax)) return false
    if (location && !includes(p.address, location) && !includes(p.title, location)) return false
    if (filters.inView && bounds && !isInBounds(p, bounds)) return false

    if (near?.metric === 'straight') {
      const km = straightLineKm(p, near.point)
      if (km == null || km > near.maxKm) return false
    } else if (near && travel && !travel.error) {
      const result = travel.results[p.id]
      if (result === null) return false // no route exists
      if (result === undefined && !travel.loading) return false // invalid location
      if (result && result.duration > near.maxMinutes * 60) return false
    }
    return true
  })
}

export const SORT_OPTIONS = [
  { value: 'rent-asc', label: 'Rent: low to high' },
  { value: 'rent-desc', label: 'Rent: high to low' },
  { value: 'floor-asc', label: 'Floor' },
  { value: 'title', label: 'Name' },
  { value: 'distance', label: 'Distance from filter point' },
]

export function sortProperties(properties, sort, near, travel) {
  const nullsLast = (a, b, compare) => (a == null ? (b == null ? 0 : 1) : b == null ? -1 : compare(a, b))
  const valueFor = {
    'rent-asc': (p) => p.rent,
    'rent-desc': (p) => p.rent,
    'floor-asc': (p) => p.floor,
    distance: (p) => {
      if (!near) return null
      if (near.metric === 'straight') return straightLineKm(p, near.point)
      return travel?.results[p.id]?.duration ?? null
    },
  }[sort]

  const sorted = [...properties]
  if (sort === 'title') {
    return sorted.sort((a, b) => (a.title || a.address || '').localeCompare(b.title || b.address || ''))
  }
  if (!valueFor) return sorted
  const direction = sort === 'rent-desc' ? -1 : 1
  return sorted.sort((a, b) => nullsLast(valueFor(a), valueFor(b), (x, y) => (x - y) * direction))
}
