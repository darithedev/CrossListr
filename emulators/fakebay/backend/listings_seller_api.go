package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maxListingTitleLen = 280
	maxListingDescLen  = 8000
	maxSellerListLimit = 100
	defaultSellerLimit = 50
)

type listingAPIRow struct {
	ID          int64
	Title       string
	Description string
	PriceCents  int64
	Currency    string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func listingToJSON(row listingAPIRow) map[string]any {
	return map[string]any{
		"id":          row.ID,
		"title":       row.Title,
		"description": row.Description,
		"priceCents":  row.PriceCents,
		"currency":    row.Currency,
		"createdAt":   row.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":   row.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func parseBearer(auth string) (token string, ok bool) {
	const p = "Bearer "
	if !strings.HasPrefix(auth, p) {
		return "", false
	}
	t := strings.TrimSpace(auth[len(p):])
	return t, t != ""
}

// bearerSeller resolves OAuth access_token → Postgres user row (canonical email + id).
func bearerSeller(w http.ResponseWriter, r *http.Request, store *oauthStore, db *sql.DB) (userID int64, emailCanon string, ok bool) {
	tok, ok := parseBearer(r.Header.Get("Authorization"))
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error":             "invalid_token",
			"error_description": "Bearer access token required",
		})
		return 0, "", false
	}
	sub, tokOK := store.validateAccessToken(tok)
	if !tokOK {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error":             "invalid_token",
			"error_description": "access token is invalid or expired",
		})
		return 0, "", false
	}
	err := db.QueryRow(
		`SELECT id, email FROM fakebay_users WHERE lower(email) = lower($1) LIMIT 1`,
		sub,
	).Scan(&userID, &emailCanon)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusForbidden, map[string]string{
				"error":             "user_not_found",
				"error_description": "token subject no longer maps to a FakeBay user account",
			})
			return 0, "", false
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database_error"})
		return 0, "", false
	}
	return userID, emailCanon, true
}

type createListingBody struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	PriceCents  int64  `json:"priceCents"`
	Currency    string `json:"currency"`
}

func validateListingDraft(title, desc, currency string, priceCents int64) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return "title is required"
	}
	if utf8.RuneCountInString(title) > maxListingTitleLen {
		return "title too long"
	}
	if utf8.RuneCountInString(desc) > maxListingDescLen {
		return "description too long"
	}
	if priceCents < 0 {
		return "priceCents must be >= 0"
	}
	if currency == "" {
		return ""
	}
	if len(currency) != 3 {
		return "currency must be a 3-letter ISO 4217 code"
	}
	for _, c := range currency {
		if c < 'A' || c > 'Z' {
			return "currency must be uppercase A–Z (e.g. USD)"
		}
	}
	return ""
}

func normalizeCurrency(c string) string {
	return strings.ToUpper(strings.TrimSpace(c))
}

func handleSellerCreateListing(w http.ResponseWriter, r *http.Request, store *oauthStore, db *sql.DB) {
	userID, _, ok := bearerSeller(w, r, store, db)
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	var body createListingBody
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<17))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json", "error_description": err.Error()})
		return
	}
	if dec.More() {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json", "error_description": "trailing JSON"})
		return
	}
	currency := normalizeCurrency(body.Currency)
	if currency == "" {
		currency = "USD"
	}
	title := strings.TrimSpace(body.Title)
	if msg := validateListingDraft(title, body.Description, currency, body.PriceCents); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "validation_error", "error_description": msg})
		return
	}
	var row listingAPIRow
	err := db.QueryRow(
		`INSERT INTO fakebay_listings (seller_id, title, description, price_cents, currency)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, title, description, price_cents, currency, created_at, updated_at`,
		userID, title, body.Description, body.PriceCents, currency,
	).Scan(&row.ID, &row.Title, &row.Description, &row.PriceCents, &row.Currency, &row.CreatedAt, &row.UpdatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "insert_failed"})
		return
	}
	writeJSON(w, http.StatusCreated, listingToJSON(row))
}

func sellerListLimit(r *http.Request) int {
	q := strings.TrimSpace(r.URL.Query().Get("limit"))
	if q == "" {
		return defaultSellerLimit
	}
	n, err := strconv.Atoi(q)
	if err != nil || n < 1 {
		return defaultSellerLimit
	}
	if n > maxSellerListLimit {
		return maxSellerListLimit
	}
	return n
}

func handleSellerListListings(w http.ResponseWriter, r *http.Request, store *oauthStore, db *sql.DB) {
	userID, _, ok := bearerSeller(w, r, store, db)
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	limit := sellerListLimit(r)
	rows, err := db.Query(
		`SELECT id, title, description, price_cents, currency, created_at, updated_at
		 FROM fakebay_listings WHERE seller_id = $1 ORDER BY updated_at DESC, id DESC LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query_failed"})
		return
	}
	defer func() { _ = rows.Close() }()

	var listings []map[string]any
	for rows.Next() {
		var row listingAPIRow
		if err := rows.Scan(&row.ID, &row.Title, &row.Description, &row.PriceCents, &row.Currency, &row.CreatedAt, &row.UpdatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scan_failed"})
			return
		}
		listings = append(listings, listingToJSON(row))
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query_failed"})
		return
	}
	if listings == nil {
		listings = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"listings": listings})
}

func parseListingID(w http.ResponseWriter, raw string) (int64, bool) {
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id < 1 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_id"})
		return 0, false
	}
	return id, true
}

func handleSellerGetListing(w http.ResponseWriter, r *http.Request, store *oauthStore, db *sql.DB) {
	userID, _, ok := bearerSeller(w, r, store, db)
	if !ok {
		return
	}
	id, ok2 := parseListingID(w, r.PathValue("id"))
	if !ok2 {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	var row listingAPIRow
	err := db.QueryRow(
		`SELECT id, title, description, price_cents, currency, created_at, updated_at
		 FROM fakebay_listings WHERE id = $1 AND seller_id = $2`,
		id, userID,
	).Scan(&row.ID, &row.Title, &row.Description, &row.PriceCents, &row.Currency, &row.CreatedAt, &row.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query_failed"})
		return
	}
	writeJSON(w, http.StatusOK, listingToJSON(row))
}

type patchListingBody struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	PriceCents  *int64  `json:"priceCents"`
	Currency    *string `json:"currency"`
}

func handleSellerPatchListing(w http.ResponseWriter, r *http.Request, store *oauthStore, db *sql.DB) {
	userID, _, ok := bearerSeller(w, r, store, db)
	if !ok {
		return
	}
	id, ok2 := parseListingID(w, r.PathValue("id"))
	if !ok2 {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	var body patchListingBody
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<17))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json"})
		return
	}
	if dec.More() {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid_json", "error_description": "trailing JSON"})
		return
	}
	if body.Title == nil && body.Description == nil && body.PriceCents == nil && body.Currency == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "empty_patch", "error_description": "provide at least one field"})
		return
	}

	tx, err := db.Begin()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx_begin_failed"})
		return
	}
	defer func() { _ = tx.Rollback() }()

	var row listingAPIRow
	err = tx.QueryRow(
		`SELECT id, title, description, price_cents, currency, created_at, updated_at
		 FROM fakebay_listings WHERE id = $1 AND seller_id = $2 FOR UPDATE`,
		id, userID,
	).Scan(&row.ID, &row.Title, &row.Description, &row.PriceCents, &row.Currency, &row.CreatedAt, &row.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query_failed"})
		return
	}

	if body.Title != nil {
		row.Title = strings.TrimSpace(*body.Title)
	}
	if body.Description != nil {
		row.Description = *body.Description
	}
	if body.PriceCents != nil {
		row.PriceCents = *body.PriceCents
	}
	if body.Currency != nil {
		row.Currency = normalizeCurrency(*body.Currency)
	}
	if row.Currency == "" {
		row.Currency = "USD"
	}

	if msg := validateListingDraft(row.Title, row.Description, row.Currency, row.PriceCents); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "validation_error", "error_description": msg})
		return
	}

	err = tx.QueryRow(
		`UPDATE fakebay_listings SET title = $1, description = $2, price_cents = $3, currency = $4, updated_at = now()
		 WHERE id = $5 AND seller_id = $6
		 RETURNING id, title, description, price_cents, currency, created_at, updated_at`,
		row.Title, row.Description, row.PriceCents, row.Currency, id, userID,
	).Scan(&row.ID, &row.Title, &row.Description, &row.PriceCents, &row.Currency, &row.CreatedAt, &row.UpdatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "update_failed"})
		return
	}
	if err := tx.Commit(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "tx_commit_failed"})
		return
	}
	writeJSON(w, http.StatusOK, listingToJSON(row))
}

func handleSellerDeleteListing(w http.ResponseWriter, r *http.Request, store *oauthStore, db *sql.DB) {
	userID, _, ok := bearerSeller(w, r, store, db)
	if !ok {
		return
	}
	id, ok2 := parseListingID(w, r.PathValue("id"))
	if !ok2 {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	res, err := db.Exec(`DELETE FROM fakebay_listings WHERE id = $1 AND seller_id = $2`, id, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "delete_failed"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not_found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
}
