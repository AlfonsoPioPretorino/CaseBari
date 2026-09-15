import { useCallback, useEffect, useState } from 'react'

// Keeps a live copy of a Firestore collection. Changes made here or on another device
// arrive through the subscription, so the CRUD helpers do not touch local state themselves.
export function useCollection(service) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setStatus('loading')
    setError(null)
    return service.subscribe(
      (next) => {
        setItems(next)
        setStatus('ready')
        setError(null)
      },
      (err) => {
        setError(err.message)
        setStatus('error')
      },
    )
  }, [service, attempt])

  // A failed subscription stops listening; retrying opens a new one.
  const load = useCallback(() => setAttempt((n) => n + 1), [])

  return { items, status, error, load, create: service.create, update: service.update, remove: service.remove }
}
