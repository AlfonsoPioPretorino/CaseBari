import { House, LogIn, LogOut } from 'lucide-react'
import App from '../App.jsx'
import { config } from '../config.js'
import { missingFirebaseSettings } from '../firebase.js'
import { useAuth } from '../hooks/useAuth.js'

function AuthScreen({ title, children }) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="brand-mark">
          <House size={18} />
        </span>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  )
}

// Shows the app only to signed-in members; otherwise explains what is missing.
export default function AuthGate() {
  if (missingFirebaseSettings.length > 0) {
    return (
      <AuthScreen title="Firebase is not configured">
        <p>
          Add these values to <code>.env.local</code> (see <code>.env.example</code>), then restart <code>npm run dev</code>:
        </p>
        <ul className="auth-missing">
          {missingFirebaseSettings.map((key) => (
            <li key={key}>
              <code>{key}</code>
            </li>
          ))}
        </ul>
      </AuthScreen>
    )
  }
  return <SignedInGate />
}

function SignedInGate() {
  const { status, user, error, signIn, signOut } = useAuth()

  if (status === 'member') return <App user={user} onSignOut={signOut} />

  if (status === 'loading' || status === 'checking') {
    return (
      <AuthScreen title={config.appName}>
        <p>{status === 'checking' ? 'Checking your access…' : 'Loading…'}</p>
      </AuthScreen>
    )
  }

  const signOutButton = (
    <button type="button" className="btn btn-block" onClick={signOut}>
      <LogOut size={16} />
      Sign out
    </button>
  )

  if (status === 'notMember') {
    return (
      <AuthScreen title="No access">
        <p>
          <strong>{user.email}</strong> is not allowed to use this app. Ask the owner to add it, or sign in with another
          account.
        </p>
        {signOutButton}
      </AuthScreen>
    )
  }

  if (status === 'error') {
    return (
      <AuthScreen title="Something went wrong">
        <div className="alert alert-error" role="alert">
          {error}
        </div>
        {signOutButton}
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title={config.appName}>
      <p>Sign in to see your rentals and points in {config.cityName}.</p>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <button type="button" className="btn btn-primary btn-block" onClick={signIn}>
        <LogIn size={16} />
        Sign in with Google
      </button>
    </AuthScreen>
  )
}
