package main

import (
	"context"
	"fmt"
	"log"
	"math/rand/v2"
	"os"
	"strings"
	"time"

	"github.com/TheBlackHowling/typedb"
	"github.com/brianvoe/gofakeit/v7"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type fakebayUser struct {
	typedb.Model
	ID           int64  `db:"id" load:"primary"`
	Email        string `db:"email"`
	PasswordHash string `db:"password_hash"`
}

func (*fakebayUser) TableName() string { return "fakebay_users" }

type fakebayListing struct {
	typedb.Model
	ID          int64  `db:"id" load:"primary"`
	SellerID    int64  `db:"seller_id"`
	Title       string `db:"title"`
	Description string `db:"description"`
	PriceCents  int64  `db:"price_cents"`
	Currency    string `db:"currency"`
}

func (*fakebayListing) TableName() string { return "fakebay_listings" }

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := typedb.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("typedb connect: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	if _, err := db.Exec(ctx, `TRUNCATE fakebay_users RESTART IDENTITY CASCADE`); err != nil {
		log.Fatalf("truncate: %v", err)
	}

	pass := os.Getenv("FAKEBAY_SEED_PASSWORD")
	if pass == "" {
		pass = "demo"
	}
	hashBytes, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}
	hashStr := string(hashBytes)

	emails := []string{
		"demo@fakebay.local",
		"vera.seed@fakebay.local",
		"kai.seed@fakebay.local",
	}
	userIDs := make([]int64, 0, len(emails))
	for _, email := range emails {
		u := &fakebayUser{Email: email, PasswordHash: hashStr}
		if err := typedb.Insert(ctx, db, u); err != nil {
			log.Fatalf("insert user %q: %v", email, err)
		}
		userIDs = append(userIDs, u.ID)
		log.Printf("seed user id=%d email=%s password=%s", u.ID, email, pass)
	}

	for _, uid := range userIDs {
		for range 2 {
			// gofakeit product strings read like English storefront copy (not faker's Latin sentence/paragraph).
			title := strings.TrimSpace(gofakeit.ProductName())
			desc := strings.TrimSpace(gofakeit.ProductDescription())
			if title == "" {
				title = "Untitled listing"
			}
			price := int64(499 + rand.IntN(499_901))
			li := &fakebayListing{
				SellerID:    uid,
				Title:       title,
				Description: desc,
				PriceCents:  price,
				Currency:    "USD",
			}
			if err := typedb.Insert(ctx, db, li); err != nil {
				log.Fatalf("insert listing: %v", err)
			}
		}
	}

	fmt.Println("fakebay seed OK")
}
