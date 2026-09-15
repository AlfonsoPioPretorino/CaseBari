import { useCallback, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

const SIGN_IN_MESSAGES = {
  'auth/unauthorized-domain':
    'This site’s domain is not authorized. Add it in Firebase console → Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled. Enable it in Firebase console → Authentication → Sign-in method.',
  'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups for this site and try again.',
  'auth/network-request-failed': 'Cannot reach Google. Check your connection.',
}

// status: loading | signedOut | checking | member | notMember | error
export function useAuth() {
  const [state, setState] = useState({ status: 'loading', user: null, error: null })

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) return setState({ status: 'signedOut', user: null, error: null })
        setState({ status: 'checking', user, error: null })
        // Access is granted by a document at members/<email> (see firestore.rules).
        try {
          const member = await getDoc(doc(db, 'members', user.email))
          if (auth.currentUser?.uid !== user.uid) return
          setState({ status: member.exists() ? 'member' : 'notMember', user, error: null })
        } catch (err) {
          if (auth.currentUser?.uid !== user.uid) return
          const error =
            err.code === 'permission-denied'
              ? 'The database refused the access check. Make sure the rules from firestore.rules are published in Firebase console → Firestore → Rules.'
              : `Could not check your access: ${err.message}`
          setState({ status: 'error', user, error })
        }
      }),
    [],
  )

  const signIn = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }))
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(auth, provider)
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return
      setState((prev) => ({ ...prev, error: SIGN_IN_MESSAGES[err.code] || `Sign-in failed: ${err.message}` }))
    }
  }, [])

  const signOut = useCallback(() => firebaseSignOut(auth), [])

  return { ...state, signIn, signOut }
}
