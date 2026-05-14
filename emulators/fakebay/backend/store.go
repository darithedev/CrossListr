package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/lib/pq"
)

type oauthStore struct {
	db *sql.DB
}

func newOAuthStore(db *sql.DB) *oauthStore {
	return &oauthStore{db: db}
}

func oauthCtx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 8*time.Second)
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

func isPQUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505"
}

func (s *oauthStore) purgeExpiredOAuth(ctx context.Context) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	stmts := []string{
		`DELETE FROM fakebay_oauth_auth_codes WHERE expires_at <= NOW()`,
		`DELETE FROM fakebay_oauth_access_tokens WHERE expires_at <= NOW()`,
		`DELETE FROM fakebay_oauth_refresh_tokens WHERE expires_at <= NOW()`,
	}
	for _, q := range stmts {
		if _, err := tx.ExecContext(ctx, q); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// runOAuthPurger periodically deletes expired rows so token tables stay bounded.
func (s *oauthStore) runOAuthPurger(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	purge := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()
		if err := s.purgeExpiredOAuth(ctx); err != nil {
			log.Printf("fakebay oauth purge: %v", err)
		}
	}
	purge()
	for range ticker.C {
		purge()
	}
}

func (s *oauthStore) issueAuthCode(clientID, redirectURI, sub string, ttl time.Duration) string {
	exp := time.Now().Add(ttl)
	for attempt := 0; attempt < 8; attempt++ {
		code := randomAuthCode()
		ctx, cancel := oauthCtx()
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO fakebay_oauth_auth_codes (code, client_id, redirect_uri, owner_sub, expires_at)
			VALUES ($1, $2, $3, $4, $5)`,
			code, clientID, redirectURI, sub, exp,
		)
		cancel()
		if err == nil {
			return code
		}
		if isPQUniqueViolation(err) {
			continue
		}
		panic(fmt.Errorf("fakebay issue auth code: %w", err))
	}
	panic(errors.New("fakebay issue auth code: too many collisions"))
}

func (s *oauthStore) consumeAuthCode(code, clientID, redirectURI string) (sub string, ok bool) {
	ctx, cancel := oauthCtx()
	defer cancel()
	var owner string
	err := s.db.QueryRowContext(ctx, `
		DELETE FROM fakebay_oauth_auth_codes
		WHERE code = $1 AND client_id = $2 AND redirect_uri = $3 AND expires_at > NOW()
		RETURNING owner_sub`,
		code, clientID, redirectURI,
	).Scan(&owner)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false
	}
	if err != nil {
		panic(fmt.Errorf("fakebay consume auth code: %w", err))
	}
	return owner, true
}

func (s *oauthStore) issueAccessAndRefresh(clientID, sub string, accessTTL, refreshTTL time.Duration) (access, refresh string, accessExp, refreshExp time.Time) {
	now := time.Now()
	accessExp = now.Add(accessTTL)
	refreshExp = now.Add(refreshTTL)
	access = ebayLikeToken("i")
	refresh = ebayLikeToken("r")

	ctx, cancel := oauthCtx()
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		panic(fmt.Errorf("fakebay issue tokens tx: %w", err))
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO fakebay_oauth_access_tokens (token, owner_sub, expires_at) VALUES ($1, $2, $3)`,
		access, sub, accessExp,
	); err != nil {
		if isPQUniqueViolation(err) {
			panic(errors.New("fakebay access token collision (extremely unlikely)"))
		}
		panic(fmt.Errorf("fakebay insert access token: %w", err))
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO fakebay_oauth_refresh_tokens (token, client_id, owner_sub, expires_at) VALUES ($1, $2, $3, $4)`,
		refresh, clientID, sub, refreshExp,
	); err != nil {
		if isPQUniqueViolation(err) {
			panic(errors.New("fakebay refresh token collision (extremely unlikely)"))
		}
		panic(fmt.Errorf("fakebay insert refresh token: %w", err))
	}

	if err := tx.Commit(); err != nil {
		panic(fmt.Errorf("fakebay issue tokens commit: %w", err))
	}
	return access, refresh, accessExp, refreshExp
}

func (s *oauthStore) rotateFromRefresh(clientID, refresh string, accessTTL time.Duration) (access string, accessExp, refreshExpiresAt time.Time, ok bool) {
	ctx, cancel := oauthCtx()
	defer cancel()

	var owner string
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_sub, expires_at FROM fakebay_oauth_refresh_tokens WHERE token = $1 AND client_id = $2`,
		refresh, clientID,
	).Scan(&owner, &refreshExpiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return "", time.Time{}, time.Time{}, false
	}
	if err != nil {
		panic(fmt.Errorf("fakebay load refresh token: %w", err))
	}
	if time.Now().After(refreshExpiresAt) {
		_, delErr := s.db.ExecContext(ctx, `DELETE FROM fakebay_oauth_refresh_tokens WHERE token = $1`, refresh)
		if delErr != nil {
			panic(fmt.Errorf("fakebay delete expired refresh: %w", delErr))
		}
		return "", time.Time{}, time.Time{}, false
	}

	access = ebayLikeToken("i")
	accessExp = time.Now().Add(accessTTL)
	_, insErr := s.db.ExecContext(ctx, `
		INSERT INTO fakebay_oauth_access_tokens (token, owner_sub, expires_at) VALUES ($1, $2, $3)`,
		access, owner, accessExp,
	)
	if insErr != nil {
		if isPQUniqueViolation(insErr) {
			panic(errors.New("fakebay access token collision on refresh (extremely unlikely)"))
		}
		panic(fmt.Errorf("fakebay rotate insert access token: %w", insErr))
	}
	return access, accessExp, refreshExpiresAt, true
}

func (s *oauthStore) validateAccessToken(token string) (sub string, ok bool) {
	ctx, cancel := oauthCtx()
	defer cancel()
	var owner string
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_sub FROM fakebay_oauth_access_tokens WHERE token = $1 AND expires_at > NOW()`, token).Scan(&owner)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false
	}
	if err != nil {
		panic(fmt.Errorf("fakebay validate access token: %w", err))
	}
	return owner, true
}
