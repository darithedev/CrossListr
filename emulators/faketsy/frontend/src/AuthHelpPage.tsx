import { Link } from 'react-router-dom'
import { authBaseUrl } from './authBase'

export default function AuthHelpPage() {
  const auth = authBaseUrl()

  return (
    <main className="wrap">
      <h1>Faketsy UI vs auth server</h1>
      <p className="lead">
        You are on the <strong>shopper SPA</strong> (port <strong>14380</strong>). Etsy-shaped OAuth (<code>/oauth/connect</code>)
        and session JSON (<code>/api/v1/session/*</code>) run on port <strong>14381</strong>. Resource + token APIs use{' '}
        <strong>14382</strong>.
      </p>
      <section className="panel">
        <h2 className="dev-heading">Quick links</h2>
        <p className="muted">
          Auth root:{' '}
          <a href={`${auth}/`}>
            <code>{auth}/</code>
          </a>
          {' · '}
          <a href={`${auth}/login`}>
            <code>/login</code>
          </a>
        </p>
      </section>
      <p>
        <Link to="/login">Sign in on this UI</Link>
      </p>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
    </main>
  )
}
