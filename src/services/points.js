import { resource } from './firestore.js'
import { validatePoint } from '../utils/validation.js'

export const pointsService = resource('points', validatePoint)

export function toPointPayload(form, location) {
  return {
    name: form.name,
    category: form.category,
    notes: form.notes,
    latitude: location.latitude,
    longitude: location.longitude,
  }
}
