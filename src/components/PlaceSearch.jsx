import { useState } from 'react'
import { Loader2, MapPinned, X } from 'lucide-react'
import { config } from '../config.js'
import { searchPlaces } from '../services/geocoding.js'

// Address/place search. Runs only on submit, as required by the Nominatim usage policy.
export default function PlaceSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    const q = query.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    try {
      setResults(await searchPlaces(q))
    } catch (err) {
      setError(err.message)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setQuery('')
    setResults(null)
    setError(null)
  }

  return (
    <div className="place-search">
      <form onSubmit={submit} role="search">
        <MapPinned size={16} className="place-search-icon" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Find a place in ${config.cityName}…`}
          aria-label="Search a place or address on the map"
        />
        {loading ? (
          <Loader2 size={16} className="spin" aria-label="Searching" />
        ) : (
          (query || results) && (
            <button type="button" className="icon-btn" onClick={clear} aria-label="Clear place search">
              <X size={16} />
            </button>
          )
        )}
      </form>
      {(error || results) && (
        <div className="place-results">
          {error && <div className="place-empty">{error}</div>}
          {results?.length === 0 && <div className="place-empty">No places found. Try another address.</div>}
          {results?.map((result) => (
            <button
              key={result.id}
              type="button"
              className="place-result"
              onClick={() => {
                onSelect(result)
                setResults(null)
              }}
            >
              {result.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
