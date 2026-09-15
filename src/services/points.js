import { resource } from './api.js'

export const pointsService = resource('points')

export function toPointPayload(form, location) {
  return {
    name: form.name,
    category: form.category,
    notes: form.notes,
    latitude: location.latitude,
    longitude: location.longitude,
  }
}
