package main

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type oauthConfig struct {
	ClientID                   string
	ClientSecret               string
	ClientDisplayName          string
	AllowedRedirectURIs        map[string]struct{}
	AuthCodeTTL                time.Duration
	AccessTokenTTLSeconds      int
	RefreshTokenTTLSeconds     int
}

func loadOAuthConfig() oauthConfig {
	id := env("FAKEBAY_CLIENT_ID", "dev-fakebay-client")
	secret := env("FAKEBAY_CLIENT_SECRET", "dev-fakebay-secret")
	display := env("FAKEBAY_CLIENT_DISPLAY_NAME", "CrossListr")

	allow := make(map[string]struct{})
	for _, raw := range strings.Split(env("FAKEBAY_ALLOWED_REDIRECT_URIS", ""), ",") {
		u := strings.TrimSpace(raw)
		if u != "" {
			allow[u] = struct{}{}
		}
	}

	// Default 90 days (~ real eBay long-lived refresh magnitude for local practice).
	refreshSecs := 90 * 24 * 3600
	if v := strings.TrimSpace(env("FAKEBAY_REFRESH_TOKEN_TTL_SECONDS", "")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			refreshSecs = n
		}
	}

	return oauthConfig{
		ClientID:                   id,
		ClientSecret:               secret,
		ClientDisplayName:          display,
		AllowedRedirectURIs:        allow,
		AuthCodeTTL:                10 * time.Minute,
		AccessTokenTTLSeconds:      7200,
		RefreshTokenTTLSeconds:     refreshSecs,
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
