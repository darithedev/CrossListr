/** Faketsy API (token, whoami, listing images). Docker host port 14382. */
export function apiBaseUrl(): string {
  return (
    import.meta.env.VITE_FAKETSY_API_ORIGIN ??
    `${window.location.protocol}//${window.location.hostname}:14382`
  )
}
