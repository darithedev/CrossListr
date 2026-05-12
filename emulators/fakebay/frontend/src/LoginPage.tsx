import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authBaseUrl } from './authBase'
import { useSession } from './SessionContext'

function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/listings'
  }
  return raw
}

export default function LoginPage() {
  const { login } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = safeReturnPath(params.get('return_to'))

  const [email, setEmail] = useState('demo@fakebay.local')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(email, password)
      navigate(returnTo, { replace: true })
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="wrap">
      <h1>Sign in to FakeBay</h1>
      <p className="muted">
        Use your FakeBay account to view listings cross-listed from CrossListr. Dev user:{' '}
        <code>demo@fakebay.local</code> / <code>demo</code>
      </p>
      {err && <p className="err">{err}</p>}
      <form className="panel" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <p>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </p>
      </form>
      <p className="muted">
        Alternative:{' '}
        <a href={`${authBaseUrl()}/login`} target="_blank" rel="noreferrer">
          sign-in form on the auth server
        </a>{' '}
        (same account).
      </p>
      <p>
        <Link to="/">← Home</Link>
      </p>
    </main>
  )
}
