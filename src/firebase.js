// Firebase setup. Values come from VITE_FIREBASE_* variables in `.env.local` (see `.env.example`).
// The web config is not a secret: access to the data is controlled by `firestore.rules`.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = import.meta.env

// Trimmed because values pasted into CI variables easily pick up a trailing newline,
// and a project ID with one makes Firestore report "the client is offline".
const settings = {
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY?.trim(),
  VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID?.trim(),
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID?.trim(),
}

export const missingFirebaseSettings = Object.keys(settings).filter((key) => !settings[key])

const app =
  missingFirebaseSettings.length === 0
    ? initializeApp({
        apiKey: settings.VITE_FIREBASE_API_KEY,
        authDomain: settings.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: settings.VITE_FIREBASE_PROJECT_ID,
        appId: settings.VITE_FIREBASE_APP_ID,
      })
    : null

// Both are null when the configuration is incomplete; AuthGate renders a setup message instead of the app.
export const auth = app && getAuth(app)
export const db = app && getFirestore(app)
