package main

import (
	"strconv"
	"strings"
	"time"
)

type oauthConfig struct {
	ClientID               string
	ClientSecret           string
	ClientDisplayName      string
	AllowedRedirectURIs    map[string]struct{}
	AuthCodeTTL            time.Duration
	AccessTokenTTLSeconds  int
	RefreshTokenTTLSeconds int
}

func loadOAuthConfig() oauthConfig {
	id := env("FAKETSY_CLIENT_ID", "dev-faketsy-client")
	secret := strings.TrimSpace(env("FAKETSY_CLIENT_SECRET", ""))
	display := env("FAKETSY_CLIENT_DISPLAY_NAME", "CrossListr")

	allow := make(map[string]struct{})
	for _, raw := range strings.Split(env("FAKETSY_ALLOWED_REDIRECT_URIS", ""), ",") {
		u := strings.TrimSpace(raw)
		if u != "" {
			allow[u] = struct{}{}
		}
	}

	refreshSecs := 90 * 24 * 3600
	if v := strings.TrimSpace(env("FAKETSY_REFRESH_TOKEN_TTL_SECONDS", "")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			refreshSecs = n
		}
	}

	accessSecs := 3600
	if v := strings.TrimSpace(env("FAKETSY_ACCESS_TOKEN_TTL_SECONDS", "")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			accessSecs = n
		}
	}

	return oauthConfig{
		ClientID:               id,
		ClientSecret:           secret,
		ClientDisplayName:      display,
		AllowedRedirectURIs:    allow,
		AuthCodeTTL:            10 * time.Minute,
		AccessTokenTTLSeconds:  accessSecs,
		RefreshTokenTTLSeconds: refreshSecs,
	}
}
