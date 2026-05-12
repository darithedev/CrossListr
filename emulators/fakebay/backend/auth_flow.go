package main

import (
	"database/sql"
	"fmt"
	"html"
	"html/template"
	"net/http"
	"net/url"
	"strings"
)

type authzParams struct {
	ResponseType string
	ClientID     string
	RedirectURI  string
	State        string
	Scope        string
}

// validateAuthzQuery returns (params, redirectURI for errors, oauth error code, description).
// If oauthErrCode is non-empty and redirectURI is empty, respond with HTTP 400 JSON (no redirect).
func validateAuthzQuery(q url.Values, cfg oauthConfig) (*authzParams, string, string, string) {
	responseType := q.Get("response_type")
	clientID := q.Get("client_id")
	redirectURI := q.Get("redirect_uri")
	state := q.Get("state")
	scope := q.Get("scope")

	if redirectURI == "" {
		return nil, "", "invalid_request", "redirect_uri is required"
	}
	redirectOK, errParse := url.ParseRequestURI(redirectURI)
	if errParse != nil || (redirectOK.Scheme != "http" && redirectOK.Scheme != "https") {
		return nil, "", "invalid_request", "redirect_uri must be an absolute http(s) URL"
	}

	if responseType != "code" {
		return nil, redirectURI, "unsupported_response_type", "response_type must be code"
	}
	if clientID == "" {
		return nil, redirectURI, "invalid_request", "client_id is required"
	}
	if clientID != cfg.ClientID {
		return nil, redirectURI, "unauthorized_client", "unknown client_id"
	}
	if len(cfg.AllowedRedirectURIs) > 0 {
		if _, allowed := cfg.AllowedRedirectURIs[redirectURI]; !allowed {
			return nil, redirectURI, "invalid_request", "redirect_uri is not registered for this client"
		}
	}

	return &authzParams{
		ResponseType: responseType,
		ClientID:     clientID,
		RedirectURI:  redirectURI,
		State:        state,
		Scope:        scope,
	}, redirectURI, "", ""
}

func safeReturnTo(raw string) (string, bool) {
	if raw == "" || len(raw) > 2048 {
		return "", false
	}
	if strings.ContainsAny(raw, "\r\n") {
		return "", false
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", false
	}
	if u.Scheme != "" || u.Host != "" {
		return "", false
	}
	if u.Path != "/oauth2/authorize" {
		return "", false
	}
	// Bare /oauth2/authorize (no query) is not enough to continue OAuth after HTML login.
	if u.RawQuery == "" {
		return "", false
	}
	return u.Path + "?" + u.RawQuery, true
}

func defaultUiReturnURL() string {
	origins := loadUiOrigins()
	if len(origins) > 0 {
		return strings.TrimRight(strings.TrimSpace(origins[0]), "/") + "/"
	}
	return "http://localhost:14180/"
}

// safeLoginReturnTo validates return targets after HTML login: FakeBay UI (allowlisted), or /oauth2/authorize?… with full OAuth query.
func safeLoginReturnTo(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return defaultUiReturnURL(), true
	}
	if !strings.Contains(raw, "://") {
		return safeReturnTo(raw)
	}
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return "", false
	}
	for _, o := range loadUiOrigins() {
		ou, err := url.Parse(strings.TrimSpace(o))
		if err != nil {
			continue
		}
		if strings.EqualFold(u.Scheme, ou.Scheme) && u.Host == ou.Host {
			return u.String(), true
		}
	}
	return "", false
}

var loginTpl = template.Must(template.New("login").Parse(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>FakeBay — Sign in</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 body{font-family:system-ui,sans-serif;background:#0f1419;color:#e6edf3;max-width:28rem;margin:2rem auto;padding:1rem}
 label{display:block;margin:.5rem 0 .25rem}
 input{width:100%;padding:.45rem;border-radius:6px;border:1px solid #30363d;background:#161b22;color:inherit}
 button{margin-top:1rem;background:#58a6ff;color:#0f1419;border:none;border-radius:6px;padding:.5rem 1rem;font-weight:600;cursor:pointer;width:100%}
 .err{color:#ff7b72;margin-top:.75rem}
 p.lead{color:#8b949e;font-size:.95rem}
</style></head><body>
<h1>Sign in to FakeBay</h1>
<p class="lead">Use your FakeBay account. You’ll be asked to approve access for the requesting app next.</p>
{{if .Error}}<p class="err">{{.Error}}</p>{{end}}
<form method="post" action="/login">
<input type="hidden" name="return_to" value="{{.ReturnTo}}">
<label>Email</label><input name="email" type="email" autocomplete="username" required value="{{.EmailDefault}}">
<label>Password</label><input name="password" type="password" autocomplete="current-password" required>
<button type="submit">Continue</button>
</form>
</body></html>`))

var consentTpl = template.Must(template.New("consent").Parse(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>FakeBay — Approve access</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 body{font-family:system-ui,sans-serif;background:#0f1419;color:#e6edf3;max-width:32rem;margin:2rem auto;padding:1rem}
 .box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.25rem;margin-top:1rem}
 button{margin:.5rem .5rem 0 0;padding:.5rem 1rem;border-radius:6px;font-weight:600;border:none;cursor:pointer}
 .approve{background:#3fb950;color:#0f1419}
 .deny{background:#30363d;color:#e6edf3}
 .muted{color:#8b949e;font-size:.9rem}
 code{background:#21262d;padding:.1em .35em;border-radius:4px;font-size:.85em;word-break:break-all}
</style></head><body>
<h1>Approve access</h1>
<p>Signed in as <strong>{{.Email}}</strong></p>
<div class="box">
<p><strong>{{.AppName}}</strong> wants to access your FakeBay account.</p>
<p class="muted">If you agree, {{.AppName}} can use FakeBay on your behalf (emulator dev flow).</p>
{{if .Scope}}<p class="muted">Requested scope: <code>{{.Scope}}</code></p>{{end}}
<form method="post" action="/oauth2/consent">
<input type="hidden" name="csrf" value="{{.CSRF}}">
<input type="hidden" name="response_type" value="{{.ResponseType}}">
<input type="hidden" name="client_id" value="{{.ClientID}}">
<input type="hidden" name="redirect_uri" value="{{.RedirectURI}}">
<input type="hidden" name="state" value="{{.State}}">
<input type="hidden" name="scope" value="{{.Scope}}">
<button type="submit" name="decision" value="approve" class="approve">Agree and continue</button>
<button type="submit" name="decision" value="deny" class="deny">Cancel</button>
</form>
</div>
</body></html>`))

type loginPage struct {
	Error        string
	ReturnTo     string
	EmailDefault string
}

type consentPage struct {
	AppName      string
	Email        string
	CSRF         string
	ResponseType string
	ClientID     string
	RedirectURI  string
	State        string
	Scope        string
}

func handleLoginGet(w http.ResponseWriter, r *http.Request) {
	ret := r.URL.Query().Get("return_to")
	target, ok := safeLoginReturnTo(ret)
	if !ok {
		target = defaultUiReturnURL()
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = loginTpl.Execute(w, loginPage{ReturnTo: target, EmailDefault: "demo@fakebay.local"})
}

func handleLoginPost(w http.ResponseWriter, r *http.Request, db *sql.DB, sm *sessionManager) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad form", http.StatusBadRequest)
		return
	}
	ret := r.PostForm.Get("return_to")
	safe, ok := safeLoginReturnTo(ret)
	if !ok {
		http.Error(w, "invalid return_to", http.StatusBadRequest)
		return
	}
	email := strings.TrimSpace(r.PostForm.Get("email"))
	pass := r.PostForm.Get("password")
	id, canon, authOK := authenticateUser(db, email, pass)
	if !authOK {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnauthorized)
		_ = loginTpl.Execute(w, loginPage{
			Error:        "Invalid email or password.",
			ReturnTo:     safe,
			EmailDefault: email,
		})
		return
	}
	sm.create(w, id, canon)
	http.Redirect(w, r, safe, http.StatusFound)
}

func handleLogout(w http.ResponseWriter, r *http.Request, sm *sessionManager) {
	if _, sid, ok := sm.get(r); ok {
		sm.destroy(w, sid)
	}
	http.Redirect(w, r, "/login?signed_out=1", http.StatusFound)
}

func handleAuthorize(w http.ResponseWriter, r *http.Request, cfg oauthConfig, store *oauthStore, sm *sessionManager) {
	p, redir, errCode, errDesc := validateAuthzQuery(r.URL.Query(), cfg)
	if errCode != "" {
		st := r.URL.Query().Get("state")
		if redir == "" {
			if strings.Contains(r.Header.Get("Accept"), "text/html") {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusBadRequest)
				_, _ = fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Authorize — FakeBay</title></head>
<body><p>This URL must include OAuth query parameters (<code>client_id</code>, <code>redirect_uri</code>, …). Open the app that starts sign-in, or go to <a href="/login">sign in</a>.</p>
<p><small>%s</small></p></body></html>`, html.EscapeString(errDesc))
				return
			}
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": errCode, "error_description": errDesc})
			return
		}
		redirectOAuthError(w, r, redir, st, errCode, errDesc)
		return
	}

	sess, sid, loggedIn := sm.get(r)
	if !loggedIn || sess == nil {
		next := "/login?return_to=" + url.QueryEscape(r.URL.RequestURI())
		http.Redirect(w, r, next, http.StatusFound)
		return
	}

	csrf := sm.rotateConsentCSRF(sid)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = consentTpl.Execute(w, consentPage{
		AppName:      cfg.ClientDisplayName,
		Email:        sess.email,
		CSRF:         csrf,
		ResponseType: p.ResponseType,
		ClientID:     p.ClientID,
		RedirectURI:  p.RedirectURI,
		State:        p.State,
		Scope:        p.Scope,
	})
}

func handleConsentPost(w http.ResponseWriter, r *http.Request, cfg oauthConfig, store *oauthStore, sm *sessionManager) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad form", http.StatusBadRequest)
		return
	}
	sess, sid, ok := sm.get(r)
	if !ok || sess == nil {
		http.Error(w, "session required", http.StatusUnauthorized)
		return
	}
	if r.PostForm.Get("csrf") == "" || r.PostForm.Get("csrf") != sess.csrf {
		http.Error(w, "invalid csrf", http.StatusBadRequest)
		return
	}

	q := url.Values{}
	q.Set("response_type", r.PostForm.Get("response_type"))
	q.Set("client_id", r.PostForm.Get("client_id"))
	q.Set("redirect_uri", r.PostForm.Get("redirect_uri"))
	q.Set("state", r.PostForm.Get("state"))
	q.Set("scope", r.PostForm.Get("scope"))

	p, redir, errCode, errDesc := validateAuthzQuery(q, cfg)
	if errCode != "" {
		st := r.PostForm.Get("state")
		if redir == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": errCode, "error_description": errDesc})
			return
		}
		redirectOAuthError(w, r, redir, st, errCode, errDesc)
		return
	}

	decision := r.PostForm.Get("decision")
	if decision == "deny" {
		redirectOAuthError(w, r, p.RedirectURI, p.State, "access_denied", "Resource owner denied the request")
		return
	}
	if decision != "approve" {
		http.Error(w, "invalid decision", http.StatusBadRequest)
		return
	}

	sub := sess.email
	code := store.issueAuthCode(p.ClientID, p.RedirectURI, sub, cfg.AuthCodeTTL)
	to, err := url.Parse(p.RedirectURI)
	if err != nil {
		http.Error(w, "invalid redirect_uri", http.StatusBadRequest)
		return
	}
	qOut := to.Query()
	qOut.Set("code", code)
	if p.State != "" {
		qOut.Set("state", p.State)
	}
	to.RawQuery = qOut.Encode()

	sm.rotateConsentCSRF(sid)

	http.Redirect(w, r, to.String(), http.StatusFound)
}
