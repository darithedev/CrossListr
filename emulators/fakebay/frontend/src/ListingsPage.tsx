import { Link, Navigate } from 'react-router-dom'
import { useSession } from './SessionContext'

/**
 * FakeBay shopper view — listings published here via CrossListr will appear when the listings API exists.
 */
export default function ListingsPage() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <main className="wrap">
        <p className="muted">Loading…</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login?return_to=/listings" replace />
  }

  return (
    <main className="wrap">
      <h1>Your listings</h1>
      <p className="lead">
        Signed in as <strong>{session.email}</strong>. This view will show postings that CrossListr has listed to
        FakeBay once the listings API is wired up.
      </p>
      <section className="panel">
        <p className="muted empty-hint">
          No listings yet. CrossList items from CrossListr to see them on FakeBay here.
        </p>
      </section>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
    </main>
  )
}
