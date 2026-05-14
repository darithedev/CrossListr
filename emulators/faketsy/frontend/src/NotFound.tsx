import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="wrap">
      <h1>Page not found</h1>
      <p className="muted">No route matches this URL in the Faketsy UI (Docker port 14380).</p>
      <ul className="links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/login">Sign in</Link>
        </li>
        <li>
          <Link to="/browse">Browse marketplace</Link>
        </li>
        <li>
          <Link to="/listings">My listings</Link>
        </li>
        <li>
          <Link to="/auth">Ports help</Link>
        </li>
      </ul>
    </main>
  )
}
