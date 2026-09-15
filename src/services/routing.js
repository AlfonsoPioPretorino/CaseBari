// Route distances, travel times and street paths from a free OSRM server (FOSSGIS, routing.openstreetmap.de).
// - "table" service: distance/time to many destinations in one request.
// - "route" service: the actual path geometry to one destination.
// Results are cached in memory only; nothing is persisted.
import { config } from '../config.js'

export const ROUTE_PROFILES = {
  walking: { label: 'Walking', path: 'routed-foot' },
  driving: { label: 'Driving', path: 'routed-car' },
}

const MAX_DESTINATIONS_PER_REQUEST = 80
const REQUEST_TIMEOUT_MS = 15000
const metricsCache = new Map()
const pathCache = new Map()

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const coordKey = (p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`
const cacheKey = (profile, from, to) => `${profile}|${coordKey(from)}|${coordKey(to)}`
const toOsrmCoords = (places) => places.map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(';')

// Requests are sent one at a time with a short pause, to stay within fair use.
let chain = Promise.resolve()
function enqueue(task) {
  const run = chain.then(task)
  chain = run.catch(() => {}).then(() => delay(300))
  return run
}

async function requestOsrm(profile, service, places, query) {
  const url = `${config.routingBaseUrl}/${ROUTE_PROFILES[profile].path}/${service}/v1/driving/${toOsrmCoords(places)}?${query}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch {
    throw new Error('Routing service is unreachable')
  } finally {
    clearTimeout(timer)
  }
  // OSRM answers some "no route" cases with HTTP 400 and a JSON body, so read the body first.
  const data = await response.json().catch(() => null)
  if (!data) throw new Error(`Routing service error (${response.status})`)
  return data
}

async function fetchTable(profile, origin, destinations) {
  const data = await requestOsrm(profile, 'table', [origin, ...destinations], 'sources=0&annotations=duration,distance')
  if (data.code !== 'Ok') throw new Error(data.message || 'Routing service returned no result')

  // Row 0 is the origin; column 0 is the origin itself.
  return destinations.map((_, i) => {
    const distance = data.distances?.[0]?.[i + 1]
    const duration = data.durations?.[0]?.[i + 1]
    return distance == null || duration == null ? null : { distance, duration }
  })
}

async function fetchRoute(profile, origin, destination) {
  const data = await requestOsrm(profile, 'route', [origin, destination], 'overview=full&geometries=geojson')
  if (data.code === 'NoRoute') return null
  if (data.code !== 'Ok') throw new Error(data.message || 'Routing service returned no result')
  const route = data.routes?.[0]
  if (!route?.geometry?.coordinates?.length) return null
  return {
    distance: route.distance,
    duration: route.duration,
    // GeoJSON is [longitude, latitude]; Leaflet wants [latitude, longitude].
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  }
}

/**
 * Returns an array aligned with `destinations`: { distance (m), duration (s) } or null when no route exists.
 * Throws when the routing service fails. Callers must fall back to straight-line distance.
 */
export async function getTravelMetrics(profile, origin, destinations) {
  const results = new Array(destinations.length)
  const missing = []
  destinations.forEach((destination, i) => {
    const key = cacheKey(profile, origin, destination)
    if (metricsCache.has(key)) results[i] = metricsCache.get(key)
    else missing.push(i)
  })

  for (let start = 0; start < missing.length; start += MAX_DESTINATIONS_PER_REQUEST) {
    const chunk = missing.slice(start, start + MAX_DESTINATIONS_PER_REQUEST)
    const metrics = await enqueue(() => fetchTable(profile, origin, chunk.map((i) => destinations[i])))
    chunk.forEach((destinationIndex, j) => {
      results[destinationIndex] = metrics[j]
      metricsCache.set(cacheKey(profile, origin, destinations[destinationIndex]), metrics[j])
    })
  }
  return results
}

/**
 * Returns an array aligned with `destinations`: { distance, duration, coordinates: [[lat, lng], ...] }
 * or null when no route exists. One request per uncached destination. Throws when the service fails.
 */
export async function getRoutePaths(profile, origin, destinations) {
  const results = []
  for (const destination of destinations) {
    const key = cacheKey(profile, origin, destination)
    if (!pathCache.has(key)) {
      pathCache.set(key, await enqueue(() => fetchRoute(profile, origin, destination)))
    }
    results.push(pathCache.get(key))
  }
  return results
}
