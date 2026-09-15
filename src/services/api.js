async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check that it is running.')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`)
  return data
}

// CRUD helpers for one REST collection.
export function resource(name) {
  return {
    list: () => request(`/${name}`),
    get: (id) => request(`/${name}/${encodeURIComponent(id)}`),
    create: (data) => request(`/${name}`, { method: 'POST', body: data }),
    update: (id, data) => request(`/${name}/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/${name}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  }
}
