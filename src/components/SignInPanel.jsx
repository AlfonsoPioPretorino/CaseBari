import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAsyncAction } from '../hooks/useAsyncAction.js'

const MIN_PASSWORD_LENGTH = 6

// Email/password sign-in, registration and password reset, plus Google sign-in.
export default function SignInPanel({ signInWithGoogle, signInWithEmail, register, resetPassword }) {
  const [mode, setMode] = useState('signIn') // signIn | register | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const { busy, error, notice, run, clear } = useAsyncAction()

  const switchMode = (next) => {
    clear()
    setPassword('')
    setConfirm('')
    setMode(next)
  }

  const submit = (event) => {
    event.preventDefault()
    if (mode === 'signIn') return run(() => signInWithEmail(email, password))
    if (mode === 'reset') {
      return run(async () => {
        await resetPassword(email)
        return `If an account exists for ${email.trim()}, you will receive an email with a link to choose a new password. Check your spam folder too.`
      })
    }
    return run(async () => {
      if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`)
      if (password !== confirm) throw new Error('The two passwords do not match.')
      await register(email, password)
    })
  }

  const feedback = (
    <>
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
    </>
  )

  if (mode === 'reset') {
    return (
      <form className="auth-form" onSubmit={submit} noValidate>
        <p>Enter your account email and we will send you a link to reset your password.</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {feedback}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <button type="button" className="link-btn auth-link" onClick={() => switchMode('signIn')}>
          Back to sign in
        </button>
      </form>
    )
  }

  const isRegister = mode === 'register'

  return (
    <div className="auth-form">
      <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
        <button type="button" role="tab" aria-selected={!isRegister} className={isRegister ? '' : 'is-active'} onClick={() => switchMode('signIn')}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'is-active' : ''} onClick={() => switchMode('register')}>
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label-row">
            Password
            {!isRegister && (
              <button type="button" className="link-btn" onClick={() => switchMode('reset')}>
                Forgot password?
              </button>
            )}
          </span>
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {isRegister && (
          <label className="field">
            <span>Confirm password</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
        )}
        {feedback}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <button type="button" className="btn btn-block" onClick={() => run(signInWithGoogle)} disabled={busy}>
        <LogIn size={16} />
        Continue with Google
      </button>
    </div>
  )
}
