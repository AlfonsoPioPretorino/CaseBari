import { config } from '../config.js'

const currency = new Intl.NumberFormat(config.locale, {
  style: 'currency',
  currency: config.currency,
  maximumFractionDigits: 0,
})
const decimal = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 1 })

export const formatRent = (rent) => (rent == null ? null : currency.format(rent))

export function formatRentShort(rent) {
  if (rent == null) return '—'
  if (rent >= 10000) return `${currency.format(Math.round(rent / 1000))}k`
  return currency.format(rent)
}

export function formatFloor(floor) {
  if (floor == null) return null
  if (floor === 0) return 'Ground floor'
  if (floor < 0) return `Basement (${floor})`
  return `Floor ${floor}`
}

export function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(km)) return '—'
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  return `${decimal.format(km)} km`
}

export const formatMeters = (meters) => formatDistanceKm(meters == null ? null : meters / 1000)

export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export const propertyTitle = (property) => property.title || property.address || 'Untitled rental'

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
}
