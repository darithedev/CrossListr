/** Faketsy auth server (OAuth + session JSON). Docker host port 14381. */
export function authBaseUrl(): string {
  return (
    import.meta.env.VITE_FAKETSY_AUTH_ORIGIN ??
    `${window.location.protocol}//${window.location.hostname}:14381`
  )
}
