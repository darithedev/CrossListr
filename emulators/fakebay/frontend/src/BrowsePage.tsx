import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { authBaseUrl } from './authBase'
import { formatMoney } from './formatMoney'

type CatalogListing = {
  id: number
  title: string
  description: string
  priceCents: number
  currency: string
  sellerEmail: string
  createdAt: string
}

/** Public view of every listing on the emulator (no sign-in). */
export default function BrowsePage() {
  const [listings, setListings] = useState<CatalogListing[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    const base = authBaseUrl()
    const r = await fetch(`${base}/api/v1/catalog/listings`)
    if (!r.ok) {
      setLoadErr(`${r.status}`)
      setListings([])
      return
    }
    const j = (await r.json()) as { listings: CatalogListing[] }
    setListings(Array.isArray(j.listings) ? j.listings : [])
    setLoadErr(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
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
  }, [load])

  if (listings === null) {
    return (
      <main className="wrap">
        <p className="muted">Loading marketplace…</p>
      </main>
    )
  }

  return (
    <main className="wrap browse-wrap">
      <h1>Marketplace</h1>
      <p className="lead">
        All active listings on this FakeBay emulator. Sign in to manage <Link to="/listings">your own postings</Link>.
      </p>
      {loadErr && <p className="err">{loadErr}</p>}
      <section className="listings-stack">
        {listings.length === 0 ? (
          <div className="panel">
            <p className="muted empty-hint">No listings yet.</p>
          </div>
        ) : (
          listings.map((l) => (
            <article key={l.id} className="panel listing-card">
              <h2 className="listing-title">{l.title}</h2>
              <p className="listing-meta">
                <strong>{formatMoney(l.priceCents, l.currency)}</strong>
                <span className="muted"> · </span>
                <span className="muted">Seller {l.sellerEmail}</span>
                <span className="muted"> · </span>
                <span className="muted">{new Date(l.createdAt).toLocaleString()}</span>
              </p>
              {l.description ? <p className="listing-desc">{l.description}</p> : null}
            </article>
          ))
        )}
      </section>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
    </main>
  )
}
