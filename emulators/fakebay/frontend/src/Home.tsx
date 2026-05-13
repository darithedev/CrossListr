import { Link } from 'react-router-dom'
import { useSession } from './SessionContext'

export default function Home() {
  const { session, loading } = useSession()

  return (
    <main className="wrap">
      <h1>FakeBay</h1>
      <p className="lead">
        Emulator storefront for listings pushed from <strong>CrossListr</strong>. Open the marketplace for every
        seller, or sign in to see your own postings.
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
        <Link to="/auth">Which port is auth? (14180 vs 14181)</Link>
      </p>

      <section className="panel muted panel-dev">
        <h2 className="dev-heading">Developers</h2>
        <p>
          OAuth integration testing (CrossListr-style app, token exchange, callback) lives on a separate page — it does
          not affect shopper sign-in above.
        </p>
        <p>
          <Link to="/demo">Open OAuth demo →</Link>
        </p>
      </section>
    </main>
  )
}
