import { useCallback, useEffect, useState } from 'react'

// Loads a REST collection and keeps local state in sync after each successful API call.
export function useCollection(service) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      setItems(await service.list())
      setStatus('ready')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [service])

  useEffect(() => {
    load()
  }, [load])

  const create = useCallback(
    async (data) => {
      const item = await service.create(data)
      setItems((prev) => [...prev, item])
      return item
    },
    [service],
  )

  const update = useCallback(
    async (id, data) => {
      const item = await service.update(id, data)
      setItems((prev) => prev.map((entry) => (entry.id === id ? item : entry)))
      return item
    },
    [service],
  )

  const remove = useCallback(
    async (id) => {
      await service.remove(id)
      setItems((prev) => prev.filter((entry) => entry.id !== id))
    },
    [service],
  )

  return { items, status, error, load, create, update, remove }
}
