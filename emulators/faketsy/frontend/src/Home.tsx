import { Link } from 'react-router-dom'
import { useSession } from './SessionContext'

export default function Home() {
  const { session, loading } = useSession()

  return (
    <main className="wrap">
      <h1>Faketsy</h1>
      <p className="lead">
        Etsy-shaped emulator: browse the catalog, sign in as a demo seller, or run the OAuth + PKCE flow like production
        Etsy (CrossListr against this stack).
      </p>

      <p className="cta-row">
        <Link to="/browse" className="primary">
          Browse marketplace
        </Link>
        {loading ? (
          <span className="muted">…</span>
        ) : session ? (
          <Link to="/listings" className="secondary">
            My listings
          </Link>
        ) : (
          <Link to="/login" className="secondary">
            Sign in
          </Link>
        )}
      </p>

      <p className="muted" style={{ marginTop: '1.25rem' }}>
        <Link to="/auth">Which port is auth? (14380 UI vs 14381)</Link>
      </p>

      <section className="panel muted panel-dev">
        <h2 className="dev-heading">Developers</h2>
        <p>
          OAuth PKCE authorize lives on <code>:14381</code>; token and <code>/v3/application/users/me</code> on{' '}
          <code>:14382</code>. SPA callback + token try flow:
        </p>
        <p>
          <Link to="/demo">Open OAuth demo →</Link>
        </p>
      </section>
    </main>
  )
}
