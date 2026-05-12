import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import AuthHelpPage from './AuthHelpPage'
import DemoPage from './DemoPage'
import Home from './Home'
import ListingsPage from './ListingsPage'
import LoginPage from './LoginPage'
import NotFound from './NotFound'
import { SessionProvider, useSession } from './SessionContext'

function NavBar() {
  const { session, loading, logout } = useSession()

  return (
    <header className="top">
      <nav>
        <Link to="/">FakeBay</Link>
        <span className="nav-sep">·</span>
        <Link to="/listings">Listings</Link>
        <span className="nav-spacer" />
        {loading ? (
          <span className="muted nav-session">…</span>
        ) : session ? (
          <span className="nav-session">
            <span className="nav-email muted" title="Signed in">
              {session.email}
            </span>
            <button type="button" className="nav-logout" onClick={() => void logout()}>
              Log out
            </button>
          </span>
        ) : (
          <Link to="/login" className="nav-signin">
            Sign in
          </Link>
        )}
        <span className="nav-sep nav-dev-sep">·</span>
        <Link to="/demo" className="nav-demo">
          OAuth demo
        </Link>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/demo/oauth/callback" element={<DemoPage />} />
          <Route path="/auth" element={<AuthHelpPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
