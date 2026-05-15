package main

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sync"
)

type userSession struct {
	userID int64
	email  string
	csrf   string
}

type sessionManager struct {
	mu sync.Mutex
	m  map[string]*userSession
}

func newSessionManager() *sessionManager {
	return &sessionManager{m: make(map[string]*userSession)}
}

func randomCookieValue(nBytes int) string {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func (sm *sessionManager) create(w http.ResponseWriter, userID int64, email string) {
	sid := randomCookieValue(24)
	sm.mu.Lock()
	sm.m[sid] = &userSession{userID: userID, email: email, csrf: randomCookieValue(16)}
	sm.mu.Unlock()
	http.SetCookie(w, &http.Cookie{
		Name:     "faketsy_sid",
		Value:    sid,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400 * 7,
	})
}

func (sm *sessionManager) get(r *http.Request) (sess *userSession, sid string, ok bool) {
	c, err := r.Cookie("faketsy_sid")
	if err != nil {
		return nil, "", false
	}
	sm.mu.Lock()
	defer sm.mu.Unlock()
	s, ok := sm.m[c.Value]
	if !ok {
		return nil, "", false
	}
	return s, c.Value, true
}

func (sm *sessionManager) rotateConsentCSRF(sid string) string {
	tok := randomCookieValue(16)
	sm.mu.Lock()
	defer sm.mu.Unlock()
	s, ok := sm.m[sid]
	if !ok {
		return ""
	}
	s.csrf = tok
	return tok
}

func (sm *sessionManager) destroy(w http.ResponseWriter, sid string) {
	sm.mu.Lock()
	delete(sm.m, sid)
	sm.mu.Unlock()
	http.SetCookie(w, &http.Cookie{
		Name:     "faketsy_sid",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}
