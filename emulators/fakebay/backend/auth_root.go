package main

import "net/http"

// authRoot explains the auth listener; there is no default HTML at / unless we add this.
func authRoot(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>FakeBay — Auth</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:system-ui,sans-serif;background:#0f1419;color:#e6edf3;max-width:36rem;margin:2rem auto;padding:1rem}
a{color:#58a6ff}
code{background:#21262d;padding:.1em .35em;border-radius:4px}
p.lead{color:#8b949e}
ul{line-height:1.7}
</style></head><body>
<h1>FakeBay auth server</h1>
<p class="lead">OAuth and sign-in live on this port. The shopper UI is on port <strong>14180</strong>.</p>
<ul>
<li><a href="/login">Sign in (HTML)</a></li>
<li><a href="/health"><code>GET /health</code></a></li>
<li><code>GET /oauth2/authorize</code> — start with query params (or use the SPA <strong>OAuth demo</strong> on :14180)</li>
</ul>
</body></html>`))
}
