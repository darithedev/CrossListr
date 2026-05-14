package main

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strings"
)

func pkceS256ChallengeFromVerifier(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func pkceS256Matches(verifier, challenge string) bool {
	got := pkceS256ChallengeFromVerifier(verifier)
	return subtle.ConstantTimeCompare([]byte(got), []byte(challenge)) == 1
}

func normalizePKCEMethod(m string) string {
	return strings.ToUpper(strings.TrimSpace(m))
}
