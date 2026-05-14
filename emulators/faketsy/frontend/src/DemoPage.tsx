import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiBaseUrl } from './apiBase'
import { authBaseUrl } from './authBase'

const PKCE_STORAGE = 'faketsy_pkce_verifier'

function randomVerifier(): string {
  const a = new Uint8Array(32)
  crypto.getRandomValues(a)
  let s = ''
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Base64Url(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function DemoPage() {
  const clientId = import.meta.env.VITE_FAKETSY_CLIENT_ID ?? 'dev-faketsy-client'
  const location = useLocation()
  const authBase = useMemo(() => authBaseUrl(), [])
  const apiBase = useMemo(() => apiBaseUrl(), [])

  const redirectUri = useMemo(() => `${window.location.origin}/demo/oauth/callback`, [])

  const [pkceErr, setPkceErr] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [whoami, setWhoami] = useState<string | null>(null)
  const [whoamiErr, setWhoamiErr] = useState<string | null>(null)
  const [tokenErr, setTokenErr] = useState<string | null>(null)

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search])
  const path = location.pathname
  const isCallback =
    path === '/demo/oauth/callback' || path.endsWith('/demo/oauth/callback')

  const code = isCallback ? qs.get('code') : null
  const oauthError = isCallback ? qs.get('error') : null
  const oauthErrorDesc = isCallback ? qs.get('error_description') : null

  const storedVerifier = isCallback ? sessionStorage.getItem(PKCE_STORAGE) : null

  const startAuthorize = useCallback(async () => {
    setPkceErr(null)
    try {
      const verifier = randomVerifier()
      const challenge = await sha256Base64Url(verifier)
      sessionStorage.setItem(PKCE_STORAGE, verifier)

      const u = new URL('/oauth/connect', authBase)
      u.searchParams.set('response_type', 'code')
      u.searchParams.set('client_id', clientId)
      u.searchParams.set('redirect_uri', redirectUri)
      u.searchParams.set('scope', 'listings_r')
      u.searchParams.set('state', 'faketsy-ui')
      u.searchParams.set('code_challenge', challenge)
      u.searchParams.set('code_challenge_method', 'S256')

      window.location.assign(u.toString())
    } catch (e) {
      setPkceErr(e instanceof Error ? e.message : String(e))
    }
  }, [authBase, clientId, redirectUri])

  const exchangeToken = useCallback(async () => {
    setTokenErr(null)
    if (!code || !storedVerifier) {
      setTokenErr('Missing authorization code or PKCE verifier (open the demo from step 1 on this origin).')
      return
    }
    try {
      const res = await fetch(`${apiBase}/v3/public/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code,
          code_verifier: storedVerifier,
        }),
      })
      const text = await res.text()
      if (!res.ok) {
        setTokenErr(`${res.status} ${text}`)
        return
      }
      const j = JSON.parse(text) as { access_token?: string }
      if (j.access_token) {
        setAccessToken(j.access_token)
      }
    } catch (e) {
      setTokenErr(e instanceof Error ? e.message : String(e))
    }
  }, [apiBase, clientId, code, redirectUri, storedVerifier])

  const tokenCurlExample = useMemo(() => {
    if (!code || !storedVerifier) return ''
    const escSh = (s: string) => s.replace(/'/g, `'\\''`)
    return (
      `curl -sS -X POST '${apiBase}/v3/public/oauth/token' \\\n` +
      `  -H 'Content-Type: application/json' \\\n` +
      `  -d '${escSh(
        JSON.stringify({
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code,
          code_verifier: storedVerifier,
        }),
      )}'`
    )
  }, [apiBase, clientId, code, redirectUri, storedVerifier])

  const callWhoami = useCallback(async () => {
    setWhoami(null)
    setWhoamiErr(null)
    const t = accessToken.trim()
    if (!t) {
      setWhoamiErr('Paste an access_token first (from the token response).')
      return
    }
    try {
      const res = await fetch(`${apiBase}/v3/application/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const text = await res.text()
      if (!res.ok) {
        setWhoamiErr(`${res.status} ${text}`)
        return
      }
      setWhoami(text)
    } catch (e) {
      setWhoamiErr(e instanceof Error ? e.message : String(e))
    }
  }, [accessToken, apiBase])

  return (
    <main className="wrap">
      <h1>Faketsy — OAuth demo</h1>
      <p>
        Mimics Etsy’s public-client flow: <strong>authorize</strong> with PKCE on the auth listener, exchange the code at{' '}
        <code>/v3/public/oauth/token</code> on the API listener, then call <code>/v3/application/users/me</code>.
      </p>

      <section className="panel">
        <h2>1. Authorization (PKCE)</h2>
        {pkceErr && <p className="err">{pkceErr}</p>}
        <p className="cta-row">
          <button type="button" className="primary" onClick={() => void startAuthorize()}>
            Sign in with Faketsy
          </button>
        </p>
        <p className="muted">
          <code>GET /oauth/connect</code> on <code>{authBase}</code> — stores <code>code_verifier</code> in{' '}
          <code>sessionStorage</code>, then redirects to <code>{redirectUri}</code>
        </p>
        <p className="muted">
          Token / whoami: <code>{apiBase}</code>
        </p>
      </section>

      {isCallback && (
        <section className="panel">
          <h2>2. Callback</h2>
          {oauthError && (
            <p className="err">
              <strong>{oauthError}</strong>
              {oauthErrorDesc ? ` — ${oauthErrorDesc}` : null}
            </p>
          )}
          {code && (
            <>
              <p>
                Authorization <code>code</code>:
              </p>
              <pre className="code">{code}</pre>
              {!storedVerifier && (
                <p className="err">
                  No PKCE verifier in session for this tab — redo step 1 from this origin, then approve again.
                </p>
              )}
              <p className="muted">
                Exchange with JSON body (<code>code_verifier</code> matches the hashed challenge). Optional secret: set{' '}
                <code>FAKETSY_CLIENT_SECRET</code> only for confidential-client practice.
              </p>
              {tokenCurlExample ? <pre className="code">{tokenCurlExample}</pre> : null}
              <p className="cta-row">
                <button type="button" className="primary" onClick={() => void exchangeToken()}>
                  Exchange code (browser fetch)
                </button>
              </p>
              {tokenErr && <p className="err">{tokenErr}</p>}
            </>
          )}
        </section>
      )}

      <section className="panel">
        <h2>3. Try Bearer API</h2>
        <p className="muted">Paste <code>access_token</code> from the JSON response.</p>
        <textarea
          className="token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="access_token…"
          rows={3}
        />
        <p>
          <button type="button" className="primary" onClick={() => void callWhoami()}>
            GET /v3/application/users/me
          </button>
        </p>
        {whoamiErr && <p className="err">{whoamiErr}</p>}
        {whoami && <pre className="code">{whoami}</pre>}
      </section>
    </main>
  )
}
