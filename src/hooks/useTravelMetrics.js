import { useEffect, useState } from 'react'
import { getRoutePaths, getTravelMetrics } from '../services/routing.js'
import { hasValidLocation } from '../utils/geo.js'

const IDLE = { results: {}, loading: false, error: null }

// Runs a routing request from `origin` to each target when inputs change. Results are never stored.
function useRouteQuery(fetcher, profile, origin, targets, enabled) {
  const validTargets = targets.filter((target) => hasValidLocation(target) && target.id !== origin?.id)
  const key =
    enabled && profile && hasValidLocation(origin) && validTargets.length
      ? `${profile}|${origin.latitude},${origin.longitude}|${validTargets
          .map((t) => `${t.id}@${t.latitude},${t.longitude}`)
          .join(';')}`
      : null

  const [state, setState] = useState({ key: null, profile: null, ...IDLE })

  useEffect(() => {
    if (!key) return
    let cancelled = false
    // Keep previous results of the same profile while recalculating to avoid flicker.
    setState((prev) => ({ key, profile, results: prev.profile === profile ? prev.results : {}, loading: true, error: null }))
    fetcher(profile, origin, validTargets).then(
      (values) => {
        if (cancelled) return
        const results = Object.fromEntries(validTargets.map((target, i) => [target.id, values[i]]))
        setState({ key, profile, results, loading: false, error: null })
      },
      (err) => {
        if (!cancelled) setState({ key, profile, results: {}, loading: false, error: err.message })
      },
    )
    return () => {
      cancelled = true
    }
    // `key` fully describes profile, origin and targets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!key) return IDLE
  if (state.key === key) return state
  return { results: state.profile === profile ? state.results : {}, loading: true, error: null }
}

/**
 * Route distance/time from `origin` to each target.
 * results[targetId] is { distance, duration }, null when no route exists, or undefined while pending.
 */
export const useTravelMetrics = (profile, origin, targets, enabled = true) =>
  useRouteQuery(getTravelMetrics, profile, origin, targets, enabled)

/**
 * Street path from `origin` to each target.
 * results[targetId] is { distance, duration, coordinates }, null when no route exists, or undefined while pending.
 */
export const useRoutePaths = (profile, origin, targets, enabled = true) =>
  useRouteQuery(getRoutePaths, profile, origin, targets, enabled)
