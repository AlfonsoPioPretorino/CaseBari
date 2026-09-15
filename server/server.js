import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createStore, DataFileError } from './store.js'
import { validatePoint, validateProperty, ValidationError } from './validation.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = path.resolve(rootDir, process.env.DATA_FILE || 'server/data/data.json')
const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || '127.0.0.1'
const distDir = path.join(rootDir, 'dist')

const store = createStore(DATA_FILE)

class NotFoundError extends Error {}

// Builds the five REST routes for one collection ("properties" or "points").
function collectionRouter(collection, validate, label) {
  const router = express.Router()
  const find = (data, id) => {
    const item = data[collection].find((entry) => entry.id === id)
    if (!item) throw new NotFoundError(`${label} not found`)
    return item
  }

  router.get('/', async (req, res) => {
    const data = await store.read()
    res.json(data[collection])
  })

  router.get('/:id', async (req, res) => {
    const data = await store.read()
    res.json(find(data, req.params.id))
  })

  router.post('/', async (req, res) => {
    const fields = validate(req.body)
    const created = await store.update((data) => {
      let id = randomUUID()
      while (data[collection].some((entry) => entry.id === id)) id = randomUUID()
      const item = { id, ...fields }
      data[collection].push(item)
      return item
    })
    res.status(201).json(created)
  })

  router.put('/:id', async (req, res) => {
    const fields = validate(req.body)
    const updated = await store.update((data) => {
      const item = find(data, req.params.id)
      const next = { id: item.id, ...fields }
      data[collection][data[collection].indexOf(item)] = next
      return next
    })
    res.json(updated)
  })

  router.delete('/:id', async (req, res) => {
    await store.update((data) => {
      const item = find(data, req.params.id)
      data[collection].splice(data[collection].indexOf(item), 1)
    })
    res.status(204).end()
  })

  return router
}

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.use('/api/properties', collectionRouter('properties', validateProperty, 'Rental'))
app.use('/api/points', collectionRouter('points', validatePoint, 'Point'))
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API endpoint' }))

// In production, serve the built frontend from the same server.
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

// Express 5 forwards rejected promises from async handlers here.
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message })
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' })
  if (err instanceof DataFileError) {
    console.error(err.message)
    return res.status(500).json({ error: 'The data file is unreadable. No changes were saved.' })
  }
  console.error(err)
  res.status(500).json({ error: 'Unexpected server error. No changes were saved.' })
})

try {
  const data = await store.init()
  console.log(`Data file: ${DATA_FILE} (${data.properties.length} rentals, ${data.points.length} points)`)
} catch (err) {
  // Never replace a file we cannot read: stop and let the user fix it.
  console.error(`\nCannot start: ${err.message}\nThe file was left untouched. Fix or move it, then restart.\n`)
  process.exit(1)
}

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`)
})
