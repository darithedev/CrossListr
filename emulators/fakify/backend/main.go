package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "emulator": "fakify"})
}

func main() {
	dsn := env("DATABASE_URL", "")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required (e.g. postgres://fakify:fakify@fakify-postgres:5432/fakify?sslmode=disable)")
	}
	uploadRoot := env("FAKIFY_UPLOAD_DIR", "/tmp/fakify-upload")
	if err := ensureUploadDirs(uploadRoot); err != nil {
		log.Fatalf("upload dir: %v", err)
	}
	db, err := openDB(dsn)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer func() { _ = db.Close() }()

	addr := env("FAKIFY_HTTP_ADDR", ":8080")
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health)
	mux.HandleFunc("POST /admin/api/{version}/graphql.json",
		handleShopifyGraphQL(db, uploadRoot))
	mux.HandleFunc("PUT /admin/internal/staged-uploads/{token}",
		func(w http.ResponseWriter, r *http.Request) {
			handleStagedPut(w, r, db, uploadRoot)
		})
	mux.HandleFunc("GET /cdn/shop/files/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleCDNFileServe(w, r, db, uploadRoot)
	})
	mux.HandleFunc("HEAD /cdn/shop/files/{id}", func(w http.ResponseWriter, r *http.Request) {
		handleCDNFileServe(w, r, db, uploadRoot)
	})

	log.Printf("fakify api listening on %s (Shopify-pattern media)", addr)
	if err := http.ListenAndServe(addr, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}
