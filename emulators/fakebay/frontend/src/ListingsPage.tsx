import { Link, Navigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { authBaseUrl } from './authBase'
import { formatMoney } from './formatMoney'
import { useSession } from './SessionContext'

type ListingDTO = {
  id: number
  title: string
  description: string
  priceCents: number
  currency: string
  createdAt: string
}

/**
 * Signed-in shopper view — listings seeded in Postgres for this emulator (and eventually CrossListr).
 */
export default function ListingsPage() {
  const { session, loading } = useSession()
  const [listings, setListings] = useState<ListingDTO[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    const base = authBaseUrl()
    const r = await fetch(`${base}/api/v1/session/listings`, { credentials: 'include' })
    if (!r.ok) {
      setLoadErr(r.status === 401 ? 'Session expired.' : `${r.status}`)
      setListings([])
      return
    }
    const j = (await r.json()) as { listings: ListingDTO[] }
    setListings(Array.isArray(j.listings) ? j.listings : [])
    setLoadErr(null)
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await fetchListings()
      } catch {
        if (!cancelled) {
          setLoadErr('Could not load listings.')
          setListings([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session, fetchListings])

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

  if (listings === null) {
    return (
      <main className="wrap">
        <p className="muted">Loading listings…</p>
      </main>
    )
  }

  return (
    <main className="wrap">
      <h1>Your listings</h1>
      <p className="lead">
        Signed in as <strong>{session.email}</strong>. Below are seeded FakeBay postings for this signed-in seller.
      </p>
      {loadErr && <p className="err">{loadErr}</p>}
      <section className="listings-stack">
        {listings.length === 0 ? (
          <div className="panel">
            <p className="muted empty-hint">No listings for this account yet.</p>
          </div>
        ) : (
          listings.map((l) => (
            <article key={l.id} className="panel listing-card">
              <h2 className="listing-title">{l.title}</h2>
              <p className="listing-meta">
                <strong>{formatMoney(l.priceCents, l.currency)}</strong>
                <span className="muted"> · </span>
                <span className="muted">{new Date(l.createdAt).toLocaleString()}</span>
              </p>
              {l.description ? <p className="listing-desc">{l.description}</p> : null}
            </article>
          ))
        )}
      </section>
      <p className="muted">
        <Link to="/browse">Browse all listings</Link>
        <span className="muted"> · </span>
        <Link to="/">← Home</Link>
      </p>
    </main>
  )
}
