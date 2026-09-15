// CRUD helpers for one Firestore collection ("properties" or "points").
//
// - Fields are validated in the browser first (same rules as `firestore.rules`, with friendlier messages).
// - `createdAt` / `updatedAt` are set by the server and used only to keep items in insertion order;
//   they are not exposed to the rest of the app.
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { ValidationError } from '../utils/validation.js'

const MESSAGES = {
  'permission-denied': 'Your account does not have access to this data.',
  unauthenticated: 'You are signed out. Sign in again.',
  unavailable: 'Cannot reach the database. Check your connection.',
  'not-found': 'This item no longer exists. It may have been deleted on another device.',
}

function friendlyError(err) {
  if (err instanceof ValidationError) return err
  return new Error(MESSAGES[err.code] || `Database error: ${err.message}`)
}

async function run(task) {
  try {
    return await task()
  } catch (err) {
    throw friendlyError(err)
  }
}

export function resource(name, validate) {
  const items = () => collection(db, name)

  return {
    // Calls `onData` with the full, ordered list now and after every change (from any device).
    // Returns the unsubscribe function.
    subscribe: (onData, onError) =>
      onSnapshot(
        items(),
        (snapshot) => {
          const rows = snapshot.docs.map((entry) => {
            // Local writes carry an estimated timestamp until the server confirms them.
            const { createdAt, updatedAt, ...fields } = entry.data({ serverTimestamps: 'estimate' })
            return { order: createdAt?.toMillis() ?? 0, item: { id: entry.id, ...fields } }
          })
          rows.sort((a, b) => a.order - b.order)
          onData(rows.map((row) => row.item))
        },
        (err) => onError(friendlyError(err)),
      ),

    create: async (data) => {
      const fields = validate(data)
      const created = await run(() =>
        addDoc(items(), { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
      )
      return { id: created.id, ...fields }
    },

    update: async (id, data) => {
      const fields = validate(data)
      await run(() => updateDoc(doc(items(), id), { ...fields, updatedAt: serverTimestamp() }))
      return { id, ...fields }
    },

    remove: (id) => run(() => deleteDoc(doc(items(), id))),
  }
}
