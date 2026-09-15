import { useCallback, useState } from 'react'

// Runs one async action at a time for a form: tracks busy state, the error message,
// and an optional success notice (the string the action resolves to).
export function useAsyncAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const run = useCallback(async (task) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await task()
      if (typeof result === 'string') setNotice(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const clear = useCallback(() => {
    setError(null)
    setNotice(null)
  }, [])

  return { busy, error, notice, run, clear }
}
