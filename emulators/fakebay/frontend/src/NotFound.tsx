import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="wrap">
      <h1>Page not found</h1>
      <p className="muted">
        This is the FakeBay UI (port <strong>14180</strong>). There is no route for this URL in the app.
      </p>
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
          <Link to="/auth">Auth ports &amp; 404 help</Link>
        </li>
      </ul>
    </main>
  )
}
