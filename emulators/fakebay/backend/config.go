package main

import (
	"os"
	"strings"
	"time"
)

type oauthConfig struct {
	ClientID              string
	ClientSecret          string
	ClientDisplayName     string
	AllowedRedirectURIs   map[string]struct{}
	AuthCodeTTL           time.Duration
	AccessTokenTTLSeconds int
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

	return oauthConfig{
		ClientID:              id,
		ClientSecret:          secret,
		ClientDisplayName:     display,
		AllowedRedirectURIs:   allow,
		AuthCodeTTL:           10 * time.Minute,
		AccessTokenTTLSeconds: 7200,
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
