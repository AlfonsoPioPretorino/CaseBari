import { resource } from './api.js'

export const propertiesService = resource('properties')

// Only the fields of the rental data model are ever sent to the API.
export function toPropertyPayload(form, location) {
  return {
    title: form.title,
    address: form.address,
    latitude: location.latitude,
    longitude: location.longitude,
    rent: form.rent === '' ? null : Number(form.rent),
    floor: form.floor === '' ? null : Number(form.floor),
    url: form.url,
    notes: form.notes,
    pros: form.pros,
    cons: form.cons,
  }
}
