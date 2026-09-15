// Place search and reverse geocoding with Nominatim (OpenStreetMap).
// Usage policy: at most 1 request per second, no search-as-you-type, cache results.
import { config } from '../config.js'

const cache = new Map()
let nextSlot = 0

async function nominatim(path, params) {
  const url = `${config.geocodingBaseUrl}/${path}?${new URLSearchParams({ format: 'jsonv2', ...params })}`
  if (cache.has(url)) return cache.get(url)

  const wait = Math.max(0, nextSlot - Date.now())
  nextSlot = Date.now() + wait + 1100
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait))

  let response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error('Place search is unreachable')
  }
  if (!response.ok) throw new Error(`Place search failed (${response.status})`)
  const data = await response.json()
  cache.set(url, data)
  return data
}

function shortAddress(result) {
  const a = result?.address
  if (!a) return result?.display_name?.split(',').slice(0, 2).join(',').trim() || ''
  const street = [a.road || a.pedestrian || a.square, a.house_number].filter(Boolean).join(' ')
  const area = a.suburb || a.quarter || a.neighbourhood || a.city_district || a.village || a.town || a.city
  return [street || result.name, area].filter(Boolean).join(', ')
}

export async function searchPlaces(query) {
  const [lat, lng] = config.cityCenter
  const span = 0.2
  const common = { q: query, limit: '6', addressdetails: '1' }
  let results = await nominatim('search', {
    ...common,
    viewbox: [lng - span, lat + span, lng + span, lat - span].join(','),
    bounded: '1',
  })
  if (!results.length) results = await nominatim('search', { ...common, q: `${query}, ${config.cityName}` })
  return results.map((r) => ({
    id: `${r.osm_type}-${r.osm_id}`,
    label: r.display_name,
    address: shortAddress(r),
    latitude: Number(r.lat),
    longitude: Number(r.lon),
  }))
}

export async function reverseGeocode(latitude, longitude) {
  const result = await nominatim('reverse', {
    lat: latitude.toFixed(6),
    lon: longitude.toFixed(6),
    zoom: '18',
    addressdetails: '1',
  })
  return result?.error ? '' : shortAddress(result)
}
