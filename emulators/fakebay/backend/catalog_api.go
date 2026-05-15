package main

import (
	"database/sql"
	"net/http"
	"time"
)

// Public catalog: all listings (emulator has no draft/inactive state yet — every row is treated as active).
func handleCatalogListingsJSON(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	w.Header().Set("Content-Type", "application/json")
	rows, err := db.Query(`
		SELECT l.id, l.title, l.description, l.price_cents, l.currency, l.created_at, l.updated_at, u.email AS seller_email
		FROM fakebay_listings l
		INNER JOIN fakebay_users u ON u.id = l.seller_id
		ORDER BY l.updated_at DESC, l.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "listings unavailable"})
		return
	}
	defer func() { _ = rows.Close() }()

	var listings []map[string]any
	for rows.Next() {
		var (
			id         int64
			title      string
			desc       string
			cents      int64
			curr       string
			created    time.Time
			updated    time.Time
			sellerMail string
		)
		if err := rows.Scan(&id, &title, &desc, &cents, &curr, &created, &updated, &sellerMail); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "listings unavailable"})
			return
		}
		listings = append(listings, map[string]any{
			"id":          id,
			"title":       title,
			"description": desc,
			"priceCents":  cents,
			"currency":    curr,
			"sellerEmail": sellerMail,
			"createdAt":   created.UTC().Format(time.RFC3339),
			"updatedAt":   updated.UTC().Format(time.RFC3339),
		})
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "listings unavailable"})
		return
	}
	if listings == nil {
		listings = []map[string]any{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"listings": listings})
}
