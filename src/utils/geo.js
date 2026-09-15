import { distance } from '@turf/distance'
import { point } from '@turf/helpers'

export function isValidLatLng(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  )
}

export const hasValidLocation = (item) => Boolean(item) && isValidLatLng(item.latitude, item.longitude)

/** Great-circle ("as the crow flies") distance in km, or null if either location is invalid. */
export function straightLineKm(a, b) {
  if (!hasValidLocation(a) || !hasValidLocation(b)) return null
  // GeoJSON order is [longitude, latitude].
  return distance(point([a.longitude, a.latitude]), point([b.longitude, b.latitude]), { units: 'kilometers' })
}

export function isInBounds(item, bounds) {
  if (!bounds || !hasValidLocation(item)) return false
  return (
    item.latitude >= bounds.south &&
    item.latitude <= bounds.north &&
    item.longitude >= bounds.west &&
    item.longitude <= bounds.east
  )
}
