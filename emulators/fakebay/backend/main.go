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
	dsn := env("DATABASE_URL", "")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required (e.g. postgres://user:pass@host:5432/db?sslmode=disable)")
	}
	db, err := openDB(dsn)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer func() { _ = db.Close() }()

	if err := ensureDemoUser(db); err != nil {
		log.Fatalf("seed user: %v", err)
	}

	cfg := loadOAuthConfig()
	store := newOAuthStore()
	sm := newSessionManager()
	uiOrigins := loadUiOrigins()

	authAddr := env("FAKEBAY_AUTH_ADDR", ":8081")
	apiAddr := env("FAKEBAY_API_ADDR", ":8082")

	sessionMux := http.NewServeMux()
	sessionMux.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) {
		handleSessionLoginJSON(w, r, db, sm)
	})
	sessionMux.HandleFunc("POST /logout", func(w http.ResponseWriter, r *http.Request) {
		handleSessionLogoutJSON(w, r, sm)
	})
	sessionMux.HandleFunc("GET /me", func(w http.ResponseWriter, r *http.Request) {
		handleSessionMeJSON(w, r, sm)
	})
	sessionMux.HandleFunc("GET /listings", func(w http.ResponseWriter, r *http.Request) {
		handleSessionListingsJSON(w, r, db, sm)
	})

	catalogMux := http.NewServeMux()
	catalogMux.HandleFunc("GET /listings", func(w http.ResponseWriter, r *http.Request) {
		handleCatalogListingsJSON(w, r, db)
	})

	auth := http.NewServeMux()
	// "GET /" alone conflicts with subtree patterns like "/api/v1/session/" on Go 1.22+ ServeMux; "/{$}"
	// matches only the URL path "/" (exact root).
	auth.HandleFunc("GET /{$}", authRoot)
	auth.Handle("/api/v1/session/", sessionAPICORS(uiOrigins, http.StripPrefix("/api/v1/session", sessionMux)))
	auth.Handle("/api/v1/catalog/", sessionAPICORS(uiOrigins, http.StripPrefix("/api/v1/catalog", catalogMux)))
	auth.HandleFunc("GET /health", health)
	auth.HandleFunc("GET /oauth2/authorize", func(w http.ResponseWriter, r *http.Request) {
		handleAuthorize(w, r, cfg, store, sm)
	})
	auth.HandleFunc("POST /oauth2/consent", func(w http.ResponseWriter, r *http.Request) {
		handleConsentPost(w, r, cfg, store, sm)
	})
	auth.HandleFunc("GET /login", handleLoginGet)
	auth.HandleFunc("POST /login", func(w http.ResponseWriter, r *http.Request) {
		handleLoginPost(w, r, db, sm)
	})
	auth.HandleFunc("GET /logout", func(w http.ResponseWriter, r *http.Request) {
		handleLogout(w, r, sm)
	})

	api := http.NewServeMux()
	api.HandleFunc("GET /openapi.yaml", handleOpenAPISpec)
	api.HandleFunc("GET /swagger", handleSwaggerUI)
	api.HandleFunc("GET /health", health)
	api.HandleFunc("POST /identity/v1/oauth2/token", func(w http.ResponseWriter, r *http.Request) {
		handleToken(w, r, cfg, store)
	})
	api.HandleFunc("GET /api/v1/oauth/whoami", func(w http.ResponseWriter, r *http.Request) {
		handleWhoami(w, r, store)
	})
	api.HandleFunc("POST /api/v1/seller/listings", func(w http.ResponseWriter, r *http.Request) {
		handleSellerCreateListing(w, r, store, db)
	})
	api.HandleFunc("GET /api/v1/seller/listings", func(w http.ResponseWriter, r *http.Request) {
		handleSellerListListings(w, r, store, db)
	})
	api.HandleFunc("GET /api/v1/seller/listings/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleSellerGetListing(w, r, store, db)
	})
	api.HandleFunc("PATCH /api/v1/seller/listings/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleSellerPatchListing(w, r, store, db)
	})
	api.HandleFunc("DELETE /api/v1/seller/listings/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleSellerDeleteListing(w, r, store, db)
	})

	go func() {
		log.Printf("fakebay auth listening on %s", authAddr)
		s := &http.Server{Addr: authAddr, Handler: auth}
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
