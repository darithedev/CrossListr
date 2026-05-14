package main

import (
	"os"
	"strings"
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envTrimmed(key string) string {
	return strings.TrimSpace(os.Getenv(key))
}
