package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
)

func loadUiOrigins() []string {
	raw := env(
		"FAKEBAY_UI_ORIGINS",
		"http://localhost:14180,http://127.0.0.1:14180",
	)
	var out []string
	for _, p := range strings.Split(raw, ",") {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func allowUiOrigin(origin string, allowlist []string) bool {
	if origin == "" {
		return false
	}
	for _, o := range allowlist {
		if origin == o {
			return true
		}
	}
	return false
}

func sessionAPICORS(allowlist []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowUiOrigin(origin, allowlist) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func handleSessionLoginJSON(w http.ResponseWriter, r *http.Request, db *sql.DB, sm *sessionManager) {
	w.Header().Set("Content-Type", "application/json")
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<14))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "invalid JSON body",
		})
		return
	}
	if dec.More() {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "trailing JSON",
		})
		return
	}

	id, canon, ok := authenticateUser(db, strings.TrimSpace(body.Email), body.Password)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "invalid email or password",
		})
		return
	}

	sm.create(w, id, canon)
	writeJSON(w, http.StatusOK, map[string]string{"email": canon})
}

func handleSessionLogoutJSON(w http.ResponseWriter, r *http.Request, sm *sessionManager) {
	w.Header().Set("Content-Type", "application/json")
	if _, sid, ok := sm.get(r); ok {
		sm.destroy(w, sid)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleSessionMeJSON(w http.ResponseWriter, r *http.Request, sm *sessionManager) {
	w.Header().Set("Content-Type", "application/json")
	sess, _, ok := sm.get(r)
	if !ok || sess == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "not signed in",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"email":  sess.email,
		"userId": sess.userID,
	})
}
