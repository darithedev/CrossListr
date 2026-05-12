/** FakeBay auth server base URL (port 14181 in Docker). */
export function authBaseUrl(): string {
  return (
    import.meta.env.VITE_FAKEBAY_AUTH_ORIGIN ??
    `${window.location.protocol}//${window.location.hostname}:14181`
  )
}
