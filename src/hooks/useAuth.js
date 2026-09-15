import { useCallback, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

const WRONG_CREDENTIALS = 'Wrong email or password.'

const MESSAGES = {
  'auth/unauthorized-domain':
    'This site’s domain is not authorized. Add it in Firebase console → Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed':
    'This sign-in method is not enabled. Enable it in Firebase console → Authentication → Sign-in method.',
  'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups for this site and try again.',
  'auth/network-request-failed': 'Cannot reach the sign-in service. Check your connection.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/invalid-credential': WRONG_CREDENTIALS,
  'auth/invalid-login-credentials': WRONG_CREDENTIALS,
  'auth/wrong-password': WRONG_CREDENTIALS,
  'auth/user-not-found': WRONG_CREDENTIALS,
  'auth/email-already-in-use': 'An account with this email already exists. Sign in, or reset your password.',
  'auth/weak-password': 'The password is too weak. Use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/account-exists-with-different-credential': 'This email is already registered with another sign-in method.',
}

function authError(err) {
  if (err.code === 'auth/password-does-not-meet-requirements') {
    // Firebase lists the unmet requirements in the message, e.g. "[Password must contain an upper case character]".
    const details = err.message.match(/\[(.*)\]/)?.[1]
    return new Error(details ? `The password does not meet the requirements: ${details}.` : 'The password does not meet the requirements.')
  }
  return new Error(MESSAGES[err.code] || `Authentication failed: ${err.message}`)
}

async function attempt(task) {
  try {
    return await task()
  } catch (err) {
    throw authError(err)
  }
}

// Makes sure the ID token carries email_verified = true, which firestore.rules requires.
async function refreshVerification(user) {
  await reload(user)
  if (user.emailVerified) await user.getIdToken(true)
  return user.emailVerified
}

// status: loading | signedOut | unverified | checking | member | notMember | error
export function useAuth() {
  const [state, setState] = useState({ status: 'loading', user: null, error: null })

  const evaluate = useCallback(async (user) => {
    const isCurrent = () => auth.currentUser?.uid === user.uid
    if (!user.emailVerified) return setState({ status: 'unverified', user, error: null })

    setState({ status: 'checking', user, error: null })
    // Access is granted by a document at members/<email> (see firestore.rules).
    try {
      const member = await getDoc(doc(db, 'members', user.email))
      if (isCurrent()) setState({ status: member.exists() ? 'member' : 'notMember', user, error: null })
    } catch (err) {
      if (!isCurrent()) return
      const error =
        err.code === 'permission-denied'
          ? 'The database refused the access check. Make sure the rules from firestore.rules are published in Firebase console → Firestore → Rules.'
          : `Could not check your access: ${err.message}`
      setState({ status: 'error', user, error })
    }
  }, [])

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) return setState({ status: 'signedOut', user: null, error: null })
        // The stored session may predate clicking the verification link: check again once.
        if (!user.emailVerified) await refreshVerification(user).catch(() => {})
        if (auth.currentUser?.uid === user.uid) evaluate(user)
      }),
    [evaluate],
  )

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(auth, provider)
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return
      throw authError(err)
    }
  }, [])

  const signInWithEmail = useCallback(
    (email, password) => attempt(() => signInWithEmailAndPassword(auth, email.trim(), password)),
    [],
  )

  const register = useCallback(
    (email, password) =>
      attempt(async () => {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await sendEmailVerification(user)
      }),
    [],
  )

  const resetPassword = useCallback((email) => attempt(() => sendPasswordResetEmail(auth, email.trim())), [])

  const resendVerification = useCallback(() => attempt(() => sendEmailVerification(auth.currentUser)), [])

  // Called after the user clicks the link in the verification email. Returns false if not verified yet.
  const checkVerification = useCallback(
    () =>
      attempt(async () => {
        const user = auth.currentUser
        const verified = await refreshVerification(user)
        if (verified) evaluate(user)
        return verified
      }),
    [evaluate],
  )

  const signOut = useCallback(() => firebaseSignOut(auth), [])

  return {
    ...state,
    signInWithGoogle,
    signInWithEmail,
    register,
    resetPassword,
    resendVerification,
    checkVerification,
    signOut,
  }
}
