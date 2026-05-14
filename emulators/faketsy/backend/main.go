package main

import (
	"log"
	"net/http"
	"time"
)

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "emulator": "faketsy"})
}

func main() {
	dsn := env("DATABASE_URL", "")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	uploadRoot := env("FAKETSY_UPLOAD_DIR", "/tmp/faketsy-upload")
	if err := ensureFaketsyUploadRoot(uploadRoot); err != nil {
		log.Fatalf("upload dir: %v", err)
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
	store := newOAuthStore(db)
	go store.runOAuthPurger(time.Minute)

	sm := newSessionManager()
	uiOrigins := loadUiOrigins()

	authAddr := env("FAKETSY_AUTH_ADDR", ":8081")
	apiAddr := env("FAKETSY_API_ADDR", ":8082")

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
	auth.HandleFunc("GET /{$}", authRoot)
	auth.Handle("/api/v1/session/", sessionAPICORS(uiOrigins, http.StripPrefix("/api/v1/session", sessionMux)))
	auth.Handle("/api/v1/catalog/", sessionAPICORS(uiOrigins, http.StripPrefix("/api/v1/catalog", catalogMux)))
	auth.HandleFunc("GET /health", health)
	auth.HandleFunc("GET /oauth/connect", func(w http.ResponseWriter, r *http.Request) {
		handleOAuthConnect(w, r, cfg, sm)
	})
	auth.HandleFunc("POST /oauth/consent", func(w http.ResponseWriter, r *http.Request) {
		handleOAuthConsentPost(w, r, cfg, store, sm)
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
	api.HandleFunc("POST /v3/public/oauth/token", func(w http.ResponseWriter, r *http.Request) {
		handlePublicOAuthToken(w, r, cfg, store)
	})
	api.HandleFunc("GET /v3/application/users/me", func(w http.ResponseWriter, r *http.Request) {
		handleEtsyWhoami(w, r, db, store)
	})
	api.HandleFunc("POST /v3/application/shops/{shop_id}/listings/{listing_id}/images", func(w http.ResponseWriter, r *http.Request) {
		handleEtsyListingImageUpload(w, r, db, uploadRoot)
	})
	api.HandleFunc("GET /v3/display/listing-images/{listing_image_id}/fullxfull", func(w http.ResponseWriter, r *http.Request) {
		handleEtsyListingImageServe(w, r, db, uploadRoot)
	})
	api.HandleFunc("HEAD /v3/display/listing-images/{listing_image_id}/fullxfull", func(w http.ResponseWriter, r *http.Request) {
		handleEtsyListingImageServe(w, r, db, uploadRoot)
	})

	go func() {
		log.Printf("faketsy auth listening on %s", authAddr)
		s := &http.Server{Addr: authAddr, Handler: auth}
		if err := s.ListenAndServe(); err != nil {
			log.Fatalf("auth server: %v", err)
		}
	}()

	log.Printf("faketsy api listening on %s", apiAddr)
	s := &http.Server{Addr: apiAddr, Handler: withCORS(api)}
	if err := s.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
