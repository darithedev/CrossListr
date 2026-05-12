package main

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func openDB(dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return db, nil
}

// Ensures one dev account exists: demo@fakebay.local / demo
func ensureDemoUser(db *sql.DB) error {
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM fakebay_users`).Scan(&n); err != nil {
		return fmt.Errorf("count users: %w", err)
	}
	if n > 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("demo"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = db.Exec(`INSERT INTO fakebay_users (email, password_hash) VALUES ($1, $2)`,
		"demo@fakebay.local", string(hash))
	if err != nil {
		return fmt.Errorf("seed demo user: %w", err)
	}
	return nil
}

func authenticateUser(db *sql.DB, email, password string) (id int64, emailCanon string, ok bool) {
	var hash string
	err := db.QueryRow(
		`SELECT id, email, password_hash FROM fakebay_users WHERE lower(email) = lower($1) LIMIT 1`,
		email,
	).Scan(&id, &emailCanon, &hash)
	if err != nil {
		return 0, "", false
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return 0, "", false
	}
	return id, emailCanon, true
}
