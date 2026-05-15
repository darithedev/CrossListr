import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { authBaseUrl } from './authBase'

export type SessionUser = { email: string; userId: number }

type SessionContextValue = {
  session: SessionUser | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const base = authBaseUrl()
    const r = await fetch(`${base}/api/v1/session/me`, { credentials: 'include' })
    if (r.ok) {
      const j = (await r.json()) as { email: string; userId: number }
      setSession({ email: j.email, userId: j.userId })
    } else {
      setSession(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await refresh()
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const base = authBaseUrl()
      const r = await fetch(`${base}/api/v1/session/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!r.ok) {
        let msg = `${r.status}`
        try {
          const j = (await r.json()) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      await refresh()
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    const base = authBaseUrl()
    await fetch(`${base}/api/v1/session/logout`, { method: 'POST', credentials: 'include' })
    setSession(null)
  }, [])

  return (
    <SessionContext.Provider value={{ session, loading, refresh, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}
