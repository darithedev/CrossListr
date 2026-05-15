package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
)

func parseBearerAuth(h string) (token string, ok bool) {
	s := strings.TrimSpace(h)
	if len(s) < 7 {
		return "", false
	}
	if strings.ToLower(s[:7]) != "bearer " {
		return "", false
	}
	t := strings.TrimSpace(s[7:])
	return t, t != ""
}

func writeEtsyJSON(w http.ResponseWriter, code int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	if body == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(body)
}

func faketsyAuthOK(w http.ResponseWriter, r *http.Request) bool {
	wantKey := strings.TrimSpace(os.Getenv("FAKETSY_API_KEY"))
	if wantKey != "" {
		got := strings.TrimSpace(r.Header.Get("X-Api-Key"))
		if got != wantKey {
			writeEtsyJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid x-api-key"})
			return false
		}
	}

	wantTok := strings.TrimSpace(os.Getenv("FAKETSY_ACCESS_TOKEN"))
	if wantTok != "" {
		tok, ok := parseBearerAuth(r.Header.Get("Authorization"))
		if !ok || tok != wantTok {
			writeEtsyJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or missing Bearer access token"})
			return false
		}
	}
	return true
}

func faketsyPublicOrigin(r *http.Request) string {
	if o := strings.TrimSuffix(env("FAKETSY_PUBLIC_ORIGIN", ""), "/"); o != "" {
		return o
	}
	proto := "http"
	if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		proto = "https"
	}
	host := r.Host
	if host == "" {
		host = "127.0.0.1:14382"
	}
	return proto + "://" + host
}

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	const hx = "0123456789abcdef"
	out := make([]byte, len(b)*2)
	for i, v := range b {
		out[i*2] = hx[v>>4]
		out[i*2+1] = hx[v&0xf]
	}
	return string(out), nil
}

func ensureFaketsyUploadRoot(root string) error {
	return os.MkdirAll(filepath.Join(root, "listing-images"), 0o775)
}

func mimeFromListingName(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".gif":
		return "image/gif"
	default:
		return "application/octet-stream"
	}
}

func handleEtsyListingImageUpload(w http.ResponseWriter, r *http.Request, db *sql.DB, uploadRoot string) {
	if !faketsyAuthOK(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		writeEtsyJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "POST required"})
		return
	}
	shopID, err1 := strconv.ParseInt(strings.TrimSpace(r.PathValue("shop_id")), 10, 64)
	listingID, err2 := strconv.ParseInt(strings.TrimSpace(r.PathValue("listing_id")), 10, 64)
	if err1 != nil || err2 != nil || shopID < 1 || listingID < 1 {
		writeEtsyJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid shop_id or listing_id"})
		return
	}

	var stub int
	err := db.QueryRow(
		`SELECT 1 FROM faketsy_listings WHERE listing_id=$1 AND shop_id=$2`,
		listingID, shopID,
	).Scan(&stub)
	if errors.Is(err, sql.ErrNoRows) {
		writeEtsyJSON(w, http.StatusNotFound, map[string]string{"error": "listing not found for shop"})
		return
	}
	if err != nil {
		writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeEtsyJSON(w, http.StatusBadRequest, map[string]string{"error": "expected multipart/form-data"})
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		writeEtsyJSON(w, http.StatusBadRequest, map[string]string{"error": "multipart field image is required (Etsy pattern)"})
		return
	}
	defer func() { _ = file.Close() }()

	fileName := strings.TrimSpace(r.FormValue("name"))
	if fileName == "" {
		fileName = filepath.Base(header.Filename)
	}
	if fileName == "" || fileName == "." {
		fileName = "upload.bin"
	}

	var rank int64
	rankRaw := strings.TrimSpace(r.FormValue("rank"))
	if rankRaw != "" {
		rank, err = strconv.ParseInt(rankRaw, 10, 64)
		if err != nil || rank < 1 {
			writeEtsyJSON(w, http.StatusBadRequest, map[string]string{"error": "rank must be a positive integer when provided"})
			return
		}
	} else {
		err := db.QueryRow(
			`SELECT COALESCE(MAX(rank), 0) + 1 FROM faketsy_listing_images WHERE listing_id = $1`,
			listingID,
		).Scan(&rank)
		if err != nil {
			writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
			return
		}
	}

	data, err := io.ReadAll(io.LimitReader(file, 32<<20))
	if err != nil {
		writeEtsyJSON(w, http.StatusBadRequest, map[string]string{"error": "cannot read upload"})
		return
	}

	mime := header.Header.Get("Content-Type")
	if mime == "" {
		mime = mimeFromListingName(fileName)
	}

	pendToken, err := randomHex(8)
	if err != nil {
		writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "token generation failed"})
		return
	}
	pendingRel := path.Join("pending", pendToken+".part")

	tx, err := db.Begin()
	if err != nil {
		writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "database error"})
		return
	}
	defer func() { _ = tx.Rollback() }()

	var imgID int64
	err = tx.QueryRow(
		`INSERT INTO faketsy_listing_images (
			listing_id, shop_id, rank, mime_type, bytes_size, original_filename, relative_path)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING listing_image_id`,
		listingID, shopID, rank, mime, int64(len(data)), fileName, pendingRel,
	).Scan(&imgID)
	if err != nil {
		if isUniqueViolation(err) {
			writeEtsyJSON(w, http.StatusConflict, map[string]string{"error": "duplicate rank for listing"})
			return
		}
		writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "insert failed"})
		return
	}

	ext := filepath.Ext(fileName)
	if ext == "" {
		ext = ".bin"
	}
	finalRel := path.Join("listing-images", fmt.Sprintf("%d%s", imgID, ext))
	diskPath := filepath.Join(uploadRoot, filepath.FromSlash(finalRel))
	if err := os.WriteFile(diskPath, data, 0o644); err != nil {
		writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "cannot persist image bytes"})
		return
	}
	if _, err := tx.Exec(`UPDATE faketsy_listing_images SET relative_path=$1 WHERE listing_image_id=$2`, finalRel, imgID); err != nil {
		_ = os.Remove(diskPath)
		writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "finalize failed"})
		return
	}
	if err := tx.Commit(); err != nil {
		_ = os.Remove(diskPath)
		writeEtsyJSON(w, http.StatusInternalServerError, map[string]string{"error": "commit failed"})
		return
	}

	base := faketsyPublicOrigin(r)
	full := fmt.Sprintf("%s/v3/display/listing-images/%d/fullxfull", base, imgID)

	writeEtsyJSON(w, http.StatusOK, map[string]any{
		"listing_id":         listingID,
		"listing_image_id":   imgID,
		"rank":               rank,
		"url_fullxfull":      full,
		"emulator_extension": "faketsy dev response shape; see Etsy listing image docs for production fields",
	})
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	// lib/pq: 23505 unique_violation
	return strings.Contains(err.Error(), "23505")
}

func handleEtsyListingImageServe(w http.ResponseWriter, r *http.Request, db *sql.DB, uploadRoot string) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		writeEtsyJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "GET or HEAD required"})
		return
	}
	rawID := strings.TrimSpace(r.PathValue("listing_image_id"))
	imgID, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil || imgID < 1 {
		http.NotFound(w, r)
		return
	}
	var mime, rel string
	err = db.QueryRow(
		`SELECT mime_type, relative_path FROM faketsy_listing_images WHERE listing_image_id=$1`,
		imgID,
	).Scan(&mime, &rel)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, "db", http.StatusInternalServerError)
		return
	}
	if strings.HasPrefix(rel, "pending/") {
		http.NotFound(w, r)
		return
	}
	data, err := os.ReadFile(filepath.Join(uploadRoot, filepath.FromSlash(rel)))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if r.Method == http.MethodHead {
		w.Header().Set("Content-Length", strconv.Itoa(len(data)))
		w.WriteHeader(http.StatusOK)
		return
	}
	_, _ = w.Write(data)
}
