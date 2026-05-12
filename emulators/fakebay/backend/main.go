package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "emulator": "fakebay"})
}

func main() {
	cfg := loadOAuthConfig()
	store := newOAuthStore()

	authAddr := env("FAKEBAY_AUTH_ADDR", ":8081")
	apiAddr := env("FAKEBAY_API_ADDR", ":8082")

	auth := http.NewServeMux()
	auth.HandleFunc("GET /health", health)
	auth.HandleFunc("GET /oauth2/authorize", func(w http.ResponseWriter, r *http.Request) {
		handleAuthorize(w, r, cfg, store)
	})

	api := http.NewServeMux()
	api.HandleFunc("GET /health", health)
	api.HandleFunc("POST /identity/v1/oauth2/token", func(w http.ResponseWriter, r *http.Request) {
		handleToken(w, r, cfg, store)
	})
	api.HandleFunc("GET /api/v1/oauth/whoami", func(w http.ResponseWriter, r *http.Request) {
		handleWhoami(w, r, store)
	})

	go func() {
		log.Printf("fakebay auth listening on %s", authAddr)
		s := &http.Server{Addr: authAddr, Handler: withCORS(auth)}
		if err := s.ListenAndServe(); err != nil {
			log.Fatalf("auth server: %v", err)
		}
	}()

	log.Printf("fakebay api listening on %s", apiAddr)
	s := &http.Server{Addr: apiAddr, Handler: withCORS(api)}
	if err := s.ListenAndServe(); err != nil {
		log.Fatalf("api server: %v", err)
	}
}
