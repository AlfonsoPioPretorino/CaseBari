import { House, LogOut, MailCheck } from 'lucide-react'
import App from '../App.jsx'
import { config } from '../config.js'
import { missingFirebaseSettings } from '../firebase.js'
import { useAsyncAction } from '../hooks/useAsyncAction.js'
import { useAuth } from '../hooks/useAuth.js'
import SignInPanel from './SignInPanel.jsx'

function AuthScreen({ title, icon: Icon = House, children }) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="brand-mark">
          <Icon size={18} />
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
  const session = useAuth()
  const { status, user, error, signOut } = session

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

  if (status === 'unverified') {
    return (
      <VerifyEmail
        email={user.email}
        onCheck={session.checkVerification}
        onResend={session.resendVerification}
        signOutButton={signOutButton}
      />
    )
  }

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
      <SignInPanel
        signInWithGoogle={session.signInWithGoogle}
        signInWithEmail={session.signInWithEmail}
        register={session.register}
        resetPassword={session.resetPassword}
      />
    </AuthScreen>
  )
}

function VerifyEmail({ email, onCheck, onResend, signOutButton }) {
  const { busy, error, notice, run } = useAsyncAction()

  const check = () =>
    run(async () => {
      if (!(await onCheck())) throw new Error('Your email is not verified yet. Open the link in the email, then try again.')
    })

  const resend = () =>
    run(async () => {
      await onResend()
      return `A new verification email was sent to ${email}.`
    })

  return (
    <AuthScreen title="Verify your email" icon={MailCheck}>
      <p>
        We sent a verification link to <strong>{email}</strong>. Open it (check your spam folder too), then come back and
        press Continue.
      </p>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-info" role="status">
          {notice}
        </div>
      )}
      <button type="button" className="btn btn-primary btn-block" onClick={check} disabled={busy}>
        {busy ? 'Please wait…' : 'I verified it, continue'}
      </button>
      <button type="button" className="btn btn-block" onClick={resend} disabled={busy}>
        Resend email
      </button>
      {signOutButton}
    </AuthScreen>
  )
}
