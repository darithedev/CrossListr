package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok", "emulator": "faketsy"})
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

	addr := env("FAKETSY_HTTP_ADDR", ":8080")
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health)
	mux.HandleFunc("POST /v3/application/shops/{shop_id}/listings/{listing_id}/images", func(w http.ResponseWriter, r *http.Request) {
		handleEtsyListingImageUpload(w, r, db, uploadRoot)
	})
	mux.HandleFunc("GET /v3/display/listing-images/{listing_image_id}/fullxfull", func(w http.ResponseWriter, r *http.Request) {
		handleEtsyListingImageServe(w, r, db, uploadRoot)
	})
	mux.HandleFunc("HEAD /v3/display/listing-images/{listing_image_id}/fullxfull", func(w http.ResponseWriter, r *http.Request) {
		handleEtsyListingImageServe(w, r, db, uploadRoot)
	})

	log.Printf("faketsy api listening on %s (Etsy-pattern listing images)", addr)
	if err := http.ListenAndServe(addr, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}
