// Single-file JSON persistence.
//
// Safety measures:
// - Every mutation runs through one in-process queue, so writes never interleave.
// - Mutations re-read the file, apply the change and write the whole document back.
// - Writes are atomic (temp file + fsync + rename via write-file-atomic), so a crash
//   mid-write leaves either the old or the new file, never a truncated one.
// - If the file cannot be parsed, nothing is written and the error is reported.
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import writeFileAtomic from 'write-file-atomic'

export class DataFileError extends Error {}

export function createStore(filePath) {
  let queue = Promise.resolve()

  function exclusive(task) {
    const run = queue.then(task, task)
    queue = run.catch(() => {})
    return run
  }

  async function read() {
    let raw
    try {
      raw = await readFile(filePath, 'utf8')
    } catch (err) {
      if (err.code === 'ENOENT') return { properties: [], points: [] }
      throw err
    }
    let data
    try {
      data = JSON.parse(raw)
    } catch (err) {
      throw new DataFileError(`Data file ${filePath} is not valid JSON: ${err.message}`)
    }
    if (!data || !Array.isArray(data.properties) || !Array.isArray(data.points)) {
      throw new DataFileError(`Data file ${filePath} must contain "properties" and "points" arrays`)
    }
    return data
  }

  async function write(data) {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFileAtomic(filePath, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8' })
  }

  return {
    read,

    // Validates the existing file (or creates an empty one) before the server accepts requests.
    init: () =>
      exclusive(async () => {
        const data = await read()
        if (!existsSync(filePath)) await write(data)
        return data
      }),

    // `mutator` changes `data` in place and returns the response value.
    // If it throws, the file is left untouched.
    update: (mutator) =>
      exclusive(async () => {
        const data = await read()
        const result = mutator(data)
        await write(data)
        return result
      }),
  }
}
