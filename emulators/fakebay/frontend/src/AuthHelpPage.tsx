import { Link } from 'react-router-dom'
import { authBaseUrl } from './authBase'

/**
 * Clarifies FakeBay UI (this port) vs auth listener (:14181) so opening the wrong origin is less confusing.
 */
export default function AuthHelpPage() {
  const auth = authBaseUrl()

  return (
    <main className="wrap">
      <h1>FakeBay UI vs auth server</h1>
      <p className="lead">
        You are on the <strong>shopper UI</strong> (this site, port <strong>14180</strong>). OAuth HTML sign-in and{' '}
        <code>/oauth2/authorize</code> run on a <strong>different</strong> port — the <strong>auth</strong> listener (
        <strong>14181</strong> in Docker).
      </p>
      <section className="panel">
        <h2 className="dev-heading">If you saw 404 on port 14181</h2>
        <p className="muted">
          That server has no React app. Use a real path, e.g.{' '}
          <a href={`${auth}/login`}>
            <code>{auth}/login</code>
          </a>{' '}
          (HTML sign-in), or start OAuth with query params on <code>/oauth2/authorize</code>. Root{' '}
          <code>{auth}/</code> may show a tiny index or redirect depending on backend version.
        </p>
      </section>
      <p>
        <Link to="/login">Sign in on this UI (JSON API → same session)</Link>
      </p>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
    </main>
  )
}
