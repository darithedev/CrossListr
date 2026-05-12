package main

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"
)

type authCodeRecord struct {
	clientID    string
	redirectURI string
	expiresAt   time.Time
}

type tokenRecord struct {
	sub       string
	expiresAt time.Time
}

type refreshRecord struct {
	clientID string
	sub      string
}

type oauthStore struct {
	mu            sync.Mutex
	authCodes     map[string]authCodeRecord
	accessTokens  map[string]tokenRecord
	refreshTokens map[string]refreshRecord
}

func newOAuthStore() *oauthStore {
	return &oauthStore{
		authCodes:     make(map[string]authCodeRecord),
		accessTokens:  make(map[string]tokenRecord),
		refreshTokens: make(map[string]refreshRecord),
	}
}

func randomString(nBytes int) string {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func ebayLikeToken(kind string) string {
	// eBay samples use opaque strings like v^1.1#... — we keep a stable prefix for access/refresh tokens.
	const ver = "v^1.1#"
	return ver + kind + "#" + randomString(32)
}

// auth codes appear in browser address bars and shell snippets; keep them shell-/URL-friendly (no ^ # etc.).
func randomAuthCode() string {
	const prefix = "fbac_"
	return prefix + randomString(48)
}

func (s *oauthStore) issueAuthCode(clientID, redirectURI string, ttl time.Duration) string {
	code := randomAuthCode()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcAuthCodesLocked()
	s.authCodes[code] = authCodeRecord{
		clientID:    clientID,
		redirectURI: redirectURI,
		expiresAt:   time.Now().Add(ttl),
	}
	return code
}

func (s *oauthStore) consumeAuthCode(code, clientID, redirectURI string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcAuthCodesLocked()
	rec, ok := s.authCodes[code]
	if !ok || time.Now().After(rec.expiresAt) {
		return false
	}
	if rec.clientID != clientID || rec.redirectURI != redirectURI {
		return false
	}
	delete(s.authCodes, code)
	return true
}

func (s *oauthStore) gcAuthCodesLocked() {
	now := time.Now()
	for k, rec := range s.authCodes {
		if now.After(rec.expiresAt) {
			delete(s.authCodes, k)
		}
	}
}

const fakeSub = "fakebay-user"

func (s *oauthStore) issueAccessAndRefresh(clientID string, accessTTL time.Duration) (access, refresh string, accessExp time.Time) {
	access = ebayLikeToken("i")
	refresh = ebayLikeToken("r")
	exp := time.Now().Add(accessTTL)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.accessTokens[access] = tokenRecord{sub: fakeSub, expiresAt: exp}
	s.refreshTokens[refresh] = refreshRecord{clientID: clientID, sub: fakeSub}
	return access, refresh, exp
}

func (s *oauthStore) rotateFromRefresh(clientID, refresh string, accessTTL time.Duration) (access string, exp time.Time, ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rec, ok := s.refreshTokens[refresh]
	if !ok || rec.clientID != clientID {
		return "", time.Time{}, false
	}

	newAccess := ebayLikeToken("i")
	exp = time.Now().Add(accessTTL)
	s.accessTokens[newAccess] = tokenRecord{sub: rec.sub, expiresAt: exp}
	return newAccess, exp, true
}

func (s *oauthStore) validateAccessToken(token string) (sub string, ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec, ok := s.accessTokens[token]
	if !ok || time.Now().After(rec.expiresAt) {
		return "", false
	}
	return rec.sub, true
}
