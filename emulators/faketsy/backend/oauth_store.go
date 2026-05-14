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

func etsyLikeToken(kind string) string {
	const prefix = "etsy_oauth_v3_"
	return prefix + kind + "_" + randomString(28)
}

func randomAuthCode() string {
	const pre = "ets_"
	return pre + randomString(48)
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
	for _, q := range []string{
		`DELETE FROM faketsy_oauth_auth_codes WHERE expires_at <= NOW()`,
		`DELETE FROM faketsy_oauth_access_tokens WHERE expires_at <= NOW()`,
		`DELETE FROM faketsy_oauth_refresh_tokens WHERE expires_at <= NOW()`,
	} {
		if _, err := tx.ExecContext(ctx, q); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *oauthStore) runOAuthPurger(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	purge := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()
		if err := s.purgeExpiredOAuth(ctx); err != nil {
			log.Printf("faketsy oauth purge: %v", err)
		}
	}
	purge()
	for range ticker.C {
		purge()
	}
}

func (s *oauthStore) issueAuthCode(clientID, redirectURI, sub string, ttl time.Duration, challenge, challengeMethod string) string {
	exp := time.Now().Add(ttl)
	for attempt := 0; attempt < 8; attempt++ {
		code := randomAuthCode()
		ctx, cancel := oauthCtx()
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO faketsy_oauth_auth_codes (code, client_id, redirect_uri, owner_sub, code_challenge, code_challenge_method, expires_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			code, clientID, redirectURI, sub, challenge, challengeMethod, exp,
		)
		cancel()
		if err == nil {
			return code
		}
		if isPQUniqueViolation(err) {
			continue
		}
		panic(fmt.Errorf("faketsy issue auth code: %w", err))
	}
	panic(errors.New("faketsy issue auth code: too many collisions"))
}

func (s *oauthStore) consumeAuthCodePKCE(code, clientID, redirectURI, verifier string) (sub string, ok bool) {
	ctx, cancel := oauthCtx()
	defer cancel()

	var challenge, method string
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_sub, code_challenge, code_challenge_method FROM faketsy_oauth_auth_codes
		WHERE code = $1 AND client_id = $2 AND redirect_uri = $3 AND expires_at > NOW()`,
		code, clientID, redirectURI,
	).Scan(&sub, &challenge, &method)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false
	}
	if err != nil {
		panic(fmt.Errorf("faketsy load auth code: %w", err))
	}

	if normalizePKCEMethod(method) != "S256" || !pkceS256Matches(verifier, challenge) {
		_, _ = s.db.ExecContext(ctx, `DELETE FROM faketsy_oauth_auth_codes WHERE code = $1`, code)
		return "", false
	}

	_, delErr := s.db.ExecContext(ctx, `DELETE FROM faketsy_oauth_auth_codes WHERE code = $1`, code)
	if delErr != nil {
		panic(fmt.Errorf("faketsy consume auth code delete: %w", delErr))
	}
	return sub, true
}

func (s *oauthStore) issueAccessAndRefresh(clientID, sub string, accessTTL, refreshTTL time.Duration) (access, refresh string, accessExp, refreshExp time.Time) {
	now := time.Now()
	accessExp = now.Add(accessTTL)
	refreshExp = now.Add(refreshTTL)
	access = etsyLikeToken("access")
	refresh = etsyLikeToken("refresh")

	ctx, cancel := oauthCtx()
	defer cancel()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		panic(fmt.Errorf("faketsy issue tokens tx: %w", err))
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO faketsy_oauth_access_tokens (token, owner_sub, expires_at) VALUES ($1, $2, $3)`,
		access, sub, accessExp,
	); err != nil {
		if isPQUniqueViolation(err) {
			panic(errors.New("faketsy access token collision"))
		}
		panic(fmt.Errorf("faketsy insert access token: %w", err))
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO faketsy_oauth_refresh_tokens (token, client_id, owner_sub, expires_at) VALUES ($1, $2, $3, $4)`,
		refresh, clientID, sub, refreshExp,
	); err != nil {
		if isPQUniqueViolation(err) {
			panic(errors.New("faketsy refresh token collision"))
		}
		panic(fmt.Errorf("faketsy insert refresh token: %w", err))
	}

	if err := tx.Commit(); err != nil {
		panic(fmt.Errorf("faketsy issue tokens commit: %w", err))
	}
	return access, refresh, accessExp, refreshExp
}

func (s *oauthStore) rotateFromRefresh(clientID, refresh string, accessTTL time.Duration) (access string, accessExp, refreshExpiresAt time.Time, ok bool) {
	ctx, cancel := oauthCtx()
	defer cancel()

	var owner string
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_sub, expires_at FROM faketsy_oauth_refresh_tokens WHERE token = $1 AND client_id = $2`,
		refresh, clientID,
	).Scan(&owner, &refreshExpiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return "", time.Time{}, time.Time{}, false
	}
	if err != nil {
		panic(fmt.Errorf("faketsy load refresh token: %w", err))
	}
	if time.Now().After(refreshExpiresAt) {
		_, delErr := s.db.ExecContext(ctx, `DELETE FROM faketsy_oauth_refresh_tokens WHERE token = $1`, refresh)
		if delErr != nil {
			panic(fmt.Errorf("faketsy delete expired refresh: %w", delErr))
		}
		return "", time.Time{}, time.Time{}, false
	}

	access = etsyLikeToken("access")
	accessExp = time.Now().Add(accessTTL)
	if _, insErr := s.db.ExecContext(ctx, `
		INSERT INTO faketsy_oauth_access_tokens (token, owner_sub, expires_at) VALUES ($1, $2, $3)`,
		access, owner, accessExp,
	); insErr != nil {
		if isPQUniqueViolation(insErr) {
			panic(errors.New("faketsy access token collision on refresh"))
		}
		panic(fmt.Errorf("faketsy rotate insert access token: %w", insErr))
	}
	return access, accessExp, refreshExpiresAt, true
}

func (s *oauthStore) validateAccessToken(token string) (sub string, ok bool) {
	ctx, cancel := oauthCtx()
	defer cancel()
	var owner string
	err := s.db.QueryRowContext(ctx, `
		SELECT owner_sub FROM faketsy_oauth_access_tokens WHERE token = $1 AND expires_at > NOW()`, token).Scan(&owner)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false
	}
	if err != nil {
		panic(fmt.Errorf("faketsy validate access token: %w", err))
	}
	return owner, true
}
