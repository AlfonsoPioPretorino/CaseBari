// Input validation, run before every write. Only whitelisted fields are kept; anything else is ignored.
// firestore.rules enforces the same limits on the database side.

export class ValidationError extends Error {}

const isBlank = (value) => value === undefined || value === null || value === ''

function text(body, field, { max, required = false }) {
  const value = body[field]
  if (isBlank(value)) {
    if (required) throw new ValidationError(`"${field}" is required`)
    return ''
  }
  if (typeof value !== 'string') throw new ValidationError(`"${field}" must be a string`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new ValidationError(`"${field}" is required`)
  if (trimmed.length > max) throw new ValidationError(`"${field}" must be at most ${max} characters`)
  return trimmed
}

function toNumber(value, field) {
  const number = typeof value === 'string' ? Number(value.trim()) : value
  if (typeof number !== 'number' || !Number.isFinite(number)) {
    throw new ValidationError(`"${field}" must be a number`)
  }
  return number
}

function coordinates(body) {
  if (isBlank(body.latitude) || isBlank(body.longitude)) {
    throw new ValidationError('A location (latitude and longitude) is required')
  }
  const latitude = toNumber(body.latitude, 'latitude')
  const longitude = toNumber(body.longitude, 'longitude')
  if (latitude < -90 || latitude > 90) throw new ValidationError('"latitude" must be between -90 and 90')
  if (longitude < -180 || longitude > 180) throw new ValidationError('"longitude" must be between -180 and 180')
  return { latitude, longitude }
}

function stringList(body, field) {
  const value = body[field]
  if (isBlank(value)) return []
  if (!Array.isArray(value)) throw new ValidationError(`"${field}" must be a list of strings`)
  if (value.length > 100) throw new ValidationError(`"${field}" can contain at most 100 entries`)
  return value.map((entry) => {
    if (typeof entry !== 'string') throw new ValidationError(`"${field}" must be a list of strings`)
    const trimmed = entry.trim()
    if (trimmed.length > 300) throw new ValidationError(`Each entry in "${field}" must be at most 300 characters`)
    return trimmed
  }).filter(Boolean)
}

function url(body) {
  const value = text(body, 'url', { max: 2000 })
  if (!value) return ''
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new ValidationError('"url" must be a valid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('"url" must start with http:// or https://')
  }
  return value
}

export function validateProperty(body = {}) {
  let rent = null
  if (!isBlank(body.rent)) {
    rent = toNumber(body.rent, 'rent')
    if (rent < 0) throw new ValidationError('"rent" cannot be negative')
  }

  let floor = null
  if (!isBlank(body.floor)) {
    // `|| 0` turns -0 into 0 so it is stored as an integer.
    floor = toNumber(body.floor, 'floor') || 0
    if (!Number.isInteger(floor) || floor < -10 || floor > 300) {
      throw new ValidationError('"floor" must be a whole number between -10 and 300')
    }
  }

  return {
    title: text(body, 'title', { max: 200 }),
    address: text(body, 'address', { max: 300 }),
    ...coordinates(body),
    rent,
    floor,
    url: url(body),
    notes: text(body, 'notes', { max: 5000 }),
    pros: stringList(body, 'pros'),
    cons: stringList(body, 'cons'),
  }
}

export function validatePoint(body = {}) {
  return {
    name: text(body, 'name', { max: 100, required: true }),
    category: text(body, 'category', { max: 100 }),
    notes: text(body, 'notes', { max: 5000 }),
    ...coordinates(body),
  }
}
