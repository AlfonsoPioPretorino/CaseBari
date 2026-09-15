// App configuration. Override any value with a VITE_* variable in `.env.local`.
const env = import.meta.env

function parseCenter(value, fallback) {
  const [lat, lng] = String(value || '').split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : fallback
}

export const config = {
  appName: env.VITE_APP_NAME || 'CaseBari',
  cityName: env.VITE_CITY_NAME || 'Bari',
  cityCenter: parseCenter(env.VITE_CITY_CENTER, [41.1171, 16.8719]),
  cityZoom: Number(env.VITE_CITY_ZOOM) || 13,
  currency: env.VITE_CURRENCY || 'EUR',
  locale: env.VITE_LOCALE || undefined,

  // OpenStreetMap standard tiles: free for light use with attribution
  // (https://operations.osmfoundation.org/policies/tiles/). Swap for another provider if usage grows.
  tileUrl: env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution:
    env.VITE_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  tileMaxZoom: Number(env.VITE_TILE_MAX_ZOOM) || 19,

  // FOSSGIS-hosted OSRM (free, fair use). Paths are <base>/routed-foot and <base>/routed-car.
  routingBaseUrl: env.VITE_ROUTING_URL || 'https://routing.openstreetmap.de',
  // Nominatim (free, max 1 request/second, no autocomplete).
  geocodingBaseUrl: env.VITE_GEOCODING_URL || 'https://nominatim.openstreetmap.org',
}
