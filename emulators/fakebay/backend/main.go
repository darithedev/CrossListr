package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "emulator": "fakebay"})
}

func main() {
	authAddr := env("FAKEBAY_AUTH_ADDR", ":8081")
	apiAddr := env("FAKEBAY_API_ADDR", ":8082")

	auth := http.NewServeMux()
	auth.HandleFunc("GET /health", health)

	api := http.NewServeMux()
	api.HandleFunc("GET /health", health)

	go func() {
		log.Printf("fakebay auth listening on %s", authAddr)
		if err := http.ListenAndServe(authAddr, auth); err != nil {
			log.Fatalf("auth server: %v", err)
		}
	}()

	log.Printf("fakebay api listening on %s", apiAddr)
	if err := http.ListenAndServe(apiAddr, api); err != nil {
		log.Fatalf("api server: %v", err)
	}
}
