import { useCallback, useMemo, useState } from 'react'

function publishedAuthBase() {
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:14181`
}

function publishedApiBase() {
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:14182`
}

export default function DemoPage() {
  const clientId = import.meta.env.VITE_FAKEBAY_CLIENT_ID ?? 'dev-fakebay-client'
  const authBase = useMemo(publishedAuthBase, [])
  const apiBase = useMemo(publishedApiBase, [])

  const redirectUri = useMemo(() => `${window.location.origin}/demo/oauth/callback`, [])

  const authorizeHref = useMemo(() => {
    const u = new URL('/oauth2/authorize', authBase)
    u.searchParams.set('client_id', clientId)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('redirect_uri', redirectUri)
    u.searchParams.set('scope', 'https://api.ebay.com/oauth/api_scope')
    u.searchParams.set('state', 'fakebay-ui')
    return u.toString()
  }, [authBase, clientId, redirectUri])

  const qs = useMemo(() => new URLSearchParams(window.location.search), [])
  const path = window.location.pathname
  const isCallback =
    path === '/demo/oauth/callback' ||
    path.endsWith('/demo/oauth/callback')

  const code = isCallback ? qs.get('code') : null
  const oauthError = isCallback ? qs.get('error') : null
  const oauthErrorDesc = isCallback ? qs.get('error_description') : null

  const [accessToken, setAccessToken] = useState('')
  const [whoami, setWhoami] = useState<string | null>(null)
  const [whoamiErr, setWhoamiErr] = useState<string | null>(null)

  const callWhoami = useCallback(async () => {
    setWhoami(null)
    setWhoamiErr(null)
    const t = accessToken.trim()
    if (!t) {
      setWhoamiErr('Paste an access_token first (from the token response).')
      return
    }
    try {
      const res = await fetch(`${apiBase}/api/v1/oauth/whoami`, {
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

  const tokenCurlExample = useMemo(() => {
    if (!code) return ''
    const escSh = (s: string) => s.replace(/'/g, `'\\''`)
    return (
      `curl -sS -u '${escSh(clientId)}:YOUR_SECRET' -X POST '${apiBase}/identity/v1/oauth2/token' \\\n` +
      `  -H 'Content-Type: application/x-www-form-urlencoded' \\\n` +
      `  --data-urlencode 'grant_type=authorization_code' \\\n` +
      `  --data-urlencode 'code=${escSh(code)}' \\\n` +
      `  --data-urlencode 'redirect_uri=${escSh(redirectUri)}'`
    )
  }, [apiBase, clientId, code, redirectUri])

  return (
    <main className="wrap">
      <h1>FakeBay — OAuth demo</h1>
      <p>
        Developer flow only. You’ll sign in on the <strong>auth</strong> server and approve{' '}
        <strong>CrossListr</strong> (display name), then land back here with an authorization <code>code</code>.
      </p>

      <section className="panel">
        <h2>1. Authorization</h2>
        <p className="cta-row">
          <button
            type="button"
            className="primary"
            onClick={() => {
              window.location.assign(authorizeHref)
            }}
          >
            Sign in with FakeBay
          </button>
          <a className="secondary" href={authorizeHref}>
            Open in new tab
          </a>
        </p>
        <p className="muted">
          <code>GET /oauth2/authorize</code> on <code>{authBase}</code> → login + consent → redirect to{' '}
          <code>{redirectUri}</code>
        </p>
        <p className="muted">
          API (token + whoami): <code>{apiBase}</code>
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
                Authorization <code>code</code> (exchange from your backend with HTTP Basic — never ship{' '}
                <code>client_secret</code> to the browser):
              </p>
              <pre className="code">{code}</pre>
              <p className="muted">Example token exchange (bash; on Windows use <code>curl.exe</code>, one line):</p>
              {tokenCurlExample ? <pre className="code">{tokenCurlExample}</pre> : null}
            </>
          )}
        </section>
      )}

      <section className="panel">
        <h2>3. Try Bearer API</h2>
        <p className="muted">Paste <code>access_token</code> from the token JSON, then call the sample protected route.</p>
        <textarea
          className="token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="access_token…"
          rows={3}
        />
        <p>
          <button type="button" className="primary" onClick={callWhoami}>
            GET /api/v1/oauth/whoami
          </button>
        </p>
        {whoamiErr && <p className="err">{whoamiErr}</p>}
        {whoami && <pre className="code">{whoami}</pre>}
      </section>
    </main>
  )
}
