package main

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

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

func refreshExpiresInSeconds(expiresAt time.Time) int {
	sec := int(expiresAt.Sub(time.Now()).Seconds())
	if sec < 0 {
		return 0
	}
	return sec
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

func readTokenFields(r *http.Request) (map[string]string, error) {
	out := map[string]string{}
	ct := strings.ToLower(r.Header.Get("Content-Type"))
	if strings.Contains(ct, "application/json") {
		var m map[string]any
		dec := json.NewDecoder(io.LimitReader(r.Body, 1<<16))
		if err := dec.Decode(&m); err != nil {
			return nil, err
		}
		for k, v := range m {
			out[strings.ToLower(strings.TrimSpace(k))] = strings.TrimSpace(fmt.Sprint(v))
		}
		return out, nil
	}
	if err := r.ParseForm(); err != nil {
		return nil, err
	}
	for k, vals := range r.PostForm {
		if len(vals) == 0 {
			continue
		}
		out[strings.ToLower(strings.TrimSpace(k))] = vals[0]
	}
	return out, nil
}

func oauthClientAuthOK(cfg oauthConfig, r *http.Request, fields map[string]string) bool {
	cid := strings.TrimSpace(fields["client_id"])
	u, p, okBasic := parseBasicAuth(r.Header.Get("Authorization"))
	if cid == "" && okBasic {
		cid = strings.TrimSpace(u)
	}
	if cid != cfg.ClientID {
		return false
	}
	if cfg.ClientSecret == "" {
		return true
	}
	if sec := strings.TrimSpace(fields["client_secret"]); sec == cfg.ClientSecret {
		return true
	}
	return okBasic && u == cfg.ClientID && p == cfg.ClientSecret
}

func handlePublicOAuthToken(w http.ResponseWriter, r *http.Request, cfg oauthConfig, store *oauthStore) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
		return
	}

	fields, err := readTokenFields(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "could not parse token request body",
		})
		return
	}

	if !oauthClientAuthOK(cfg, r, fields) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error":             "invalid_client",
			"error_description": "invalid client authentication",
		})
		return
	}

	grant := strings.TrimSpace(fields["grant_type"])
	switch grant {
	case "authorization_code":
		handleTokenAuthCode(w, cfg, store, fields)
	case "refresh_token":
		handleTokenRefresh(w, cfg, store, fields)
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "unsupported_grant_type",
			"error_description": "grant_type must be authorization_code or refresh_token",
		})
	}
}

func handleTokenAuthCode(w http.ResponseWriter, cfg oauthConfig, store *oauthStore, fields map[string]string) {
	code := strings.TrimSpace(fields["code"])
	redir := strings.TrimSpace(fields["redirect_uri"])
	verifier := strings.TrimSpace(fields["code_verifier"])
	if code == "" || redir == "" || verifier == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "code, redirect_uri, and code_verifier are required",
		})
		return
	}

	sub, ok := store.consumeAuthCodePKCE(code, cfg.ClientID, redir, verifier)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_grant",
			"error_description": "code is invalid, expired, PKCE failed, or redirect_uri mismatch",
		})
		return
	}

	accessTTL := time.Duration(cfg.AccessTokenTTLSeconds) * time.Second
	refreshTTL := time.Duration(cfg.RefreshTokenTTLSeconds) * time.Second
	at, rt, _, refreshExp := store.issueAccessAndRefresh(cfg.ClientID, sub, accessTTL, refreshTTL)
	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":             at,
		"token_type":               "Bearer",
		"expires_in":               cfg.AccessTokenTTLSeconds,
		"refresh_token":            rt,
		"refresh_token_expires_in": refreshExpiresInSeconds(refreshExp),
	})
}

func handleTokenRefresh(w http.ResponseWriter, cfg oauthConfig, store *oauthStore, fields map[string]string) {
	rt := strings.TrimSpace(fields["refresh_token"])
	if rt == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "refresh_token is required",
		})
		return
	}

	accessTTL := time.Duration(cfg.AccessTokenTTLSeconds) * time.Second
	at, _, refreshExp, ok := store.rotateFromRefresh(cfg.ClientID, rt, accessTTL)
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":             "invalid_grant",
			"error_description": "refresh_token is expired, invalid, or revoked",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":             at,
		"token_type":               "Bearer",
		"expires_in":               cfg.AccessTokenTTLSeconds,
		"refresh_token_expires_in": refreshExpiresInSeconds(refreshExp),
	})
}

func handleEtsyWhoami(w http.ResponseWriter, r *http.Request, db *sql.DB, store *oauthStore) {
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

	userID, err := strconv.ParseInt(strings.TrimSpace(sub), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"user_id":        sub,
			"primary_email":  "",
			"token_type":     "Bearer",
			"emulator":       "faketsy",
			"owner_sub_note": "non-numeric subject (dev)",
		})
		return
	}

	var email string
	err = db.QueryRow(`SELECT email FROM faketsy_users WHERE id = $1`, userID).Scan(&email)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusOK, map[string]any{
			"user_id":    userID,
			"emulator":   "faketsy",
			"token_type": "Bearer",
		})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "user lookup failed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user_id":        userID,
		"primary_email":  email,
		"token_type":     "Bearer",
		"emulator":       "faketsy",
	})
}
