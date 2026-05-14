package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func refreshExpiresInSeconds(expiresAt time.Time) int {
	sec := int(expiresAt.Sub(time.Now()).Seconds())
	if sec < 0 {
		return 0
	}
	return sec
}

func redirectOAuthError(w http.ResponseWriter, r *http.Request, redirectURI, state, errCode, description string) {
	to, err := url.Parse(redirectURI)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s","error_description":%q}`, errCode, description), http.StatusBadRequest)
		return
	}
	q := to.Query()
	q.Set("error", errCode)
	q.Set("error_description", description)
	if state != "" {
		q.Set("state", state)
	}
	to.RawQuery = q.Encode()
	http.Redirect(w, r, to.String(), http.StatusFound)
}

// --- POST /identity/v1/oauth2/token (API listener) ---

func handleToken(w http.ResponseWriter, r *http.Request, cfg oauthConfig, store *oauthStore) {
	w.Header().Set("Content-Type", "application/json")

	if err := r.ParseForm(); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "could not parse form body",
		})
		return
	}

	cid, secret, ok := parseBasicAuth(r.Header.Get("Authorization"))
	if !ok || cid != cfg.ClientID || secret != cfg.ClientSecret {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error":             "invalid_client",
			"error_description": "invalid or missing Authorization Basic client credentials",
		})
		return
	}

	grant := r.PostForm.Get("grant_type")
	switch grant {
	case "authorization_code":
		handleTokenAuthCode(w, r, cfg, store, cid)
	case "refresh_token":
		handleTokenRefresh(w, r, cfg, store, cid)
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "unsupported_grant_type",
			"error_description": "grant_type must be authorization_code or refresh_token",
		})
	}
}

func handleTokenAuthCode(w http.ResponseWriter, r *http.Request, cfg oauthConfig, store *oauthStore, clientID string) {
	code := r.PostForm.Get("code")
	redir := r.PostForm.Get("redirect_uri")
	if code == "" || redir == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "code and redirect_uri are required",
		})
		return
	}

	sub, ok := store.consumeAuthCode(code, clientID, redir)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_grant",
			"error_description": "code is invalid, expired, or redirect_uri does not match",
		})
		return
	}

	accessTTL := time.Duration(cfg.AccessTokenTTLSeconds) * time.Second
	refreshTTL := time.Duration(cfg.RefreshTokenTTLSeconds) * time.Second
	at, rt, _, refreshExp := store.issueAccessAndRefresh(clientID, sub, accessTTL, refreshTTL)
	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":               at,
		"expires_in":                 cfg.AccessTokenTTLSeconds,
		"refresh_token":            rt,
		"refresh_token_expires_in":   refreshExpiresInSeconds(refreshExp),
		"token_type":                 "User Access Token",
	})
}

func handleTokenRefresh(w http.ResponseWriter, r *http.Request, cfg oauthConfig, store *oauthStore, clientID string) {
	rt := r.PostForm.Get("refresh_token")
	if rt == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "refresh_token is required",
		})
		return
	}

	accessTTL := time.Duration(cfg.AccessTokenTTLSeconds) * time.Second
	at, _, refreshExp, ok := store.rotateFromRefresh(clientID, rt, accessTTL)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_grant",
			"error_description": "refresh_token is expired, invalid, or revoked",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":             at,
		"expires_in":               cfg.AccessTokenTTLSeconds,
		"refresh_token_expires_in": refreshExpiresInSeconds(refreshExp),
		"token_type":               "User Access Token",
	})
}

func parseBasicAuth(header string) (user, pass string, ok bool) {
	const p = "Basic "
	if !strings.HasPrefix(header, p) {
		return "", "", false
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(header[len(p):]))
	if err != nil {
		return "", "", false
	}
	idx := strings.IndexByte(string(raw), ':')
	if idx < 0 {
		return "", "", false
	}
	return string(raw[:idx]), string(raw[idx+1:]), true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	_ = enc.Encode(v)
}

// --- Protected sample route ---

func handleWhoami(w http.ResponseWriter, r *http.Request, store *oauthStore) {
	w.Header().Set("Content-Type", "application/json")
	auth := r.Header.Get("Authorization")
	const p = "Bearer "
	if !strings.HasPrefix(auth, p) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error":             "invalid_token",
			"error_description": "Bearer access token required",
		})
		return
	}
	token := strings.TrimSpace(auth[len(p):])
	sub, ok := store.validateAccessToken(token)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error":             "invalid_token",
			"error_description": "access token is invalid or expired",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"sub":        sub,
		"token_type": "User Access Token",
		"emulator":   "fakebay",
	})
}
