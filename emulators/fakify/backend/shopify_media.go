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
	"path/filepath"
	"strconv"
	"strings"
)

const fakifyStagedScheme = "fakify-staged://"

func shopifyAccessTokenOK(r *http.Request) bool {
	required := strings.TrimSpace(os.Getenv("FAKIFY_SHOPIFY_ACCESS_TOKEN"))
	if required == "" {
		return true
	}
	got := strings.TrimSpace(r.Header.Get("X-Shopify-Access-Token"))
	return got != "" && got == required
}

func fakifyPublicOrigin(r *http.Request) string {
	if o := strings.TrimSuffix(env("FAKIFY_PUBLIC_ORIGIN", ""), "/"); o != "" {
		return o
	}
	proto := "http"
	if r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https") {
		proto = "https"
	}
	host := r.Host
	if host == "" {
		host = "127.0.0.1:14282"
	}
	return proto + "://" + host
}

func ensureUploadDirs(root string) error {
	if err := os.MkdirAll(filepath.Join(root, "staging"), 0o775); err != nil {
		return err
	}
	return os.MkdirAll(filepath.Join(root, "files"), 0o775)
}

func newStagingToken() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	const hexch = "0123456789abcdef"
	out := make([]byte, 32)
	for i, v := range b {
		out[i*2] = hexch[v>>4]
		out[i*2+1] = hexch[v&0xf]
	}
	return string(out), nil
}

func writeGraphQLErrors(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"errors": []map[string]string{{"message": msg}},
	})
}

func graphqlExtensionsEnvelope() map[string]any {
	return map[string]any{"fakify": "shopify-pattern-emulator-v1"}
}

type gqlRequest struct {
	Query          string          `json:"query"`
	Variables      json.RawMessage `json:"variables,omitempty"`
	QueryID        string          `json:"queryId,omitempty"`
	OperationName  string          `json:"operationName,omitempty"`
}

type stagedInputs struct {
	Input []struct {
		Filename   string `json:"filename"`
		MimeType   string `json:"mimeType"`
		FileSize   string `json:"fileSize"`
		Resource   string `json:"resource"`
		HTTPMethod string `json:"httpMethod"`
	} `json:"input"`
}

type fileCreateInputs struct {
	Files []struct {
		OriginalSource string `json:"originalSource"`
		Filename       string `json:"filename"`
		ContentType    string `json:"contentType"`
		Alt            string `json:"alt"`
	} `json:"files"`
}

func mimeFromFilename(name string) string {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}

func handleShopifyGraphQL(db *sql.DB, uploadRoot string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !shopifyAccessTokenOK(r) {
			writeGraphQLErrors(w, http.StatusUnauthorized, "invalid or missing X-Shopify-Access-Token")
			return
		}
		if r.Method != http.MethodPost {
			writeGraphQLErrors(w, http.StatusMethodNotAllowed, "method not supported")
			return
		}
		var req gqlRequest
		dec := json.NewDecoder(io.LimitReader(r.Body, 1<<22))
		if err := dec.Decode(&req); err != nil {
			writeGraphQLErrors(w, http.StatusBadRequest, "could not parse JSON body")
			return
		}
		qUpper := strings.ToUpper(req.Query)
		switch {
		case strings.Contains(qUpper, "STAGEDUPLOADSCREATE"):
			handleStagedUploadsCreate(w, r, db, uploadRoot, req)
		case strings.Contains(qUpper, "FILECREATE"):
			handleShopifyFileCreate(w, r, db, uploadRoot, req)
		default:
			writeGraphQLErrors(w, http.StatusBadRequest,
				"Fakify only supports Shopify-pattern stagedUploadsCreate and fileCreate for media in this emulator")
		}
	}
}

func handleStagedUploadsCreate(w http.ResponseWriter, r *http.Request, db *sql.DB, uploadRoot string, req gqlRequest) {
	_ = uploadRoot // reserved
	var vars stagedInputs
	if len(req.Variables) != 0 {
		if err := json.Unmarshal(req.Variables, &vars); err != nil {
			writeGraphQLErrors(w, http.StatusBadRequest, "variables must be JSON")
			return
		}
	}
	if len(vars.Input) != 1 {
		writeGraphQLErrors(w, http.StatusBadRequest, "provide exactly one staged upload input item")
		return
	}
	in := vars.Input[0]
	filename := strings.TrimSpace(in.Filename)
	if filename == "" {
		filename = "upload.bin"
	}
	mime := strings.TrimSpace(in.MimeType)
	if mime == "" {
		mime = mimeFromFilename(filename)
	}
	token, err := newStagingToken()
	if err != nil {
		writeGraphQLErrors(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	_, err = db.Exec(
		`INSERT INTO fakify_staged_upload (token, filename, mime_type, status) VALUES ($1, $2, $3, 'pending')`,
		token, filename, mime,
	)
	if err != nil {
		writeGraphQLErrors(w, http.StatusInternalServerError, "failed to reserve staged upload")
		return
	}
	origin := fakifyPublicOrigin(r)
	putURL := origin + "/admin/internal/staged-uploads/" + token
	resourceURL := fakifyStagedScheme + token

	httpMethod := strings.ToUpper(strings.TrimSpace(in.HTTPMethod))
	if httpMethod == "" {
		httpMethod = "PUT"
	}

	target := map[string]any{
		"url":         putURL,
		"resourceUrl": resourceURL,
		"parameters":  []any{},
		"httpMethod":  httpMethod,
	}

	body := map[string]any{
		"data": map[string]any{
			"stagedUploadsCreate": map[string]any{
				"userErrors":    []any{},
				"stagedTargets": []any{target},
			},
		},
		"extensions": graphqlExtensionsEnvelope(),
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(body)
}

func handleStagedPut(w http.ResponseWriter, r *http.Request, db *sql.DB, uploadRoot string) {
	if !shopifyAccessTokenOK(r) {
		writeGraphQLErrors(w, http.StatusUnauthorized, "invalid or missing X-Shopify-Access-Token")
		return
	}
	if r.Method != http.MethodPut {
		writeGraphQLErrors(w, http.StatusMethodNotAllowed, "PUT required")
		return
	}
	token := strings.TrimSpace(r.PathValue("token"))
	if token == "" {
		writeGraphQLErrors(w, http.StatusBadRequest, "missing token")
		return
	}
	var filename, mime, status string
	err := db.QueryRow(
		`SELECT filename, mime_type, status FROM fakify_staged_upload WHERE token = $1 AND expires_at > now()`,
		token,
	).Scan(&filename, &mime, &status)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		writeGraphQLErrors(w, http.StatusInternalServerError, "database error")
		return
	}
	if status != "pending" {
		writeGraphQLErrors(w, http.StatusConflict, "staging token already used")
		return
	}

	storageName := token + filepath.Ext(filename)
	if storageName == token {
		storageName = token + ".bin"
	}
	path := filepath.Join(uploadRoot, "staging", storageName)
	out, err := os.Create(path)
	if err != nil {
		writeGraphQLErrors(w, http.StatusInternalServerError, "cannot create staging file")
		return
	}
	n, cpErr := io.Copy(out, io.LimitReader(r.Body, 1<<26))
	closeErr := out.Close()
	if cpErr != nil || closeErr != nil {
		_ = os.Remove(path)
		writeGraphQLErrors(w, http.StatusBadRequest, "upload body unreadable")
		return
	}
	_, err = db.Exec(`UPDATE fakify_staged_upload SET status = 'uploaded', bytes_size = $1 WHERE token = $2`, n, token)
	if err != nil {
		_ = os.Remove(path)
		writeGraphQLErrors(w, http.StatusInternalServerError, "database error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseStagingToken(originalSource string) (string, error) {
	s := strings.TrimSpace(originalSource)
	if !strings.HasPrefix(s, fakifyStagedScheme) {
		return "", fmt.Errorf("originalSource must use scheme %s", fakifyStagedScheme)
	}
	tok := strings.TrimSpace(strings.TrimPrefix(s, fakifyStagedScheme))
	if tok == "" {
		return "", fmt.Errorf("missing token")
	}
	return tok, nil
}

func handleShopifyFileCreate(w http.ResponseWriter, r *http.Request, db *sql.DB, uploadRoot string, req gqlRequest) {
	var vars fileCreateInputs
	if len(req.Variables) != 0 {
		if err := json.Unmarshal(req.Variables, &vars); err != nil {
			writeGraphQLErrors(w, http.StatusBadRequest, "variables must be JSON")
			return
		}
	}
	if len(vars.Files) != 1 {
		writeGraphQLErrors(w, http.StatusBadRequest, "provide exactly one FileCreateInput in files[] for this emulator")
		return
	}
	src := strings.TrimSpace(vars.Files[0].OriginalSource)
	token, err := parseStagingToken(src)
	if err != nil {
		writeGraphQLErrors(w, http.StatusBadRequest, err.Error())
		return
	}
	var mime, stagedStatus, stagedName string
	var stagedBytes int64
	err = db.QueryRow(
		`SELECT mime_type, status, filename, bytes_size FROM fakify_staged_upload WHERE token=$1 AND expires_at > now()`,
		token,
	).Scan(&mime, &stagedStatus, &stagedName, &stagedBytes)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeGraphQLErrors(w, http.StatusBadRequest, "unknown staged upload token")
			return
		}
		writeGraphQLErrors(w, http.StatusInternalServerError, "database error")
		return
	}
	if stagedStatus != "uploaded" {
		writeGraphQLErrors(w, http.StatusBadRequest, "staged PUT not completed for this token")
		return
	}

	storageName := token + filepath.Ext(stagedName)
	if storageName == token {
		storageName = token + ".bin"
	}
	fromPath := filepath.Join(uploadRoot, "staging", storageName)
	data, readErr := os.ReadFile(fromPath)
	if readErr != nil || int64(len(data)) != stagedBytes {
		writeGraphQLErrors(w, http.StatusInternalServerError, "staged bytes missing from disk")
		return
	}

	tx, err := db.Begin()
	if err != nil {
		writeGraphQLErrors(w, http.StatusInternalServerError, "database error")
		return
	}
	defer func() { _ = tx.Rollback() }()

	pendingGID := "pending:" + token
	pendingRel := "pending/" + token
	var fid int64
	err = tx.QueryRow(
		`INSERT INTO fakify_media_file (gid, mime_type, bytes_size, relative_path, original_filename)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		pendingGID, mime, stagedBytes, pendingRel, filepath.Base(stagedName),
	).Scan(&fid)
	if err != nil {
		writeGraphQLErrors(w, http.StatusInternalServerError, "insert failed")
		return
	}
	gid := fmt.Sprintf("gid://shopify/MediaImage/%d", fid)
	ext := filepath.Ext(stagedName)
	if ext == "" {
		ext = ".bin"
	}
	relative := fmt.Sprintf("files/%d%s", fid, ext)
	toPath := filepath.Join(uploadRoot, relative)
	if err := os.WriteFile(toPath, data, 0o644); err != nil {
		writeGraphQLErrors(w, http.StatusInternalServerError, "failed to finalize file")
		return
	}
	_, err = tx.Exec(`UPDATE fakify_media_file SET gid=$1, relative_path=$2 WHERE id=$3`, gid, relative, fid)
	if err != nil {
		_ = os.Remove(toPath)
		writeGraphQLErrors(w, http.StatusInternalServerError, "finalize failed")
		return
	}
	_, err = tx.Exec(`DELETE FROM fakify_staged_upload WHERE token=$1`, token)
	if err != nil {
		_ = os.Remove(toPath)
		writeGraphQLErrors(w, http.StatusInternalServerError, "cleanup failed")
		return
	}
	if err := tx.Commit(); err != nil {
		_ = os.Remove(toPath)
		writeGraphQLErrors(w, http.StatusInternalServerError, "commit failed")
		return
	}
	_ = os.Remove(fromPath)

	imgURL := fakifyPublicOrigin(r) + "/cdn/shop/files/" + strconv.FormatInt(fid, 10)

	fileNode := map[string]any{
		"id":   gid,
		"alt":  strings.TrimSpace(vars.Files[0].Alt),
		"__typename": "MediaImage",
		"preview": map[string]any{
			"status": "READY",
			"image": map[string]any{
				"url":      imgURL,
				"altText":  strings.TrimSpace(vars.Files[0].Alt),
				"originalSrc": imgURL,
			},
		},
	}

	body := map[string]any{
		"data": map[string]any{
			"fileCreate": map[string]any{
				"files":      []any{fileNode},
				"userErrors": []any{},
			},
		},
		"extensions": graphqlExtensionsEnvelope(),
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(body)
}

func handleCDNFileServe(w http.ResponseWriter, r *http.Request, db *sql.DB, uploadRoot string) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not supported"})
		return
	}
	idStr := strings.TrimSpace(r.PathValue("id"))
	if idStr == "" {
		http.NotFound(w, r)
		return
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id < 1 {
		http.NotFound(w, r)
		return
	}
	var mime, rel string
	err = db.QueryRow(`SELECT mime_type, relative_path FROM fakify_media_file WHERE id=$1`, id).Scan(&mime, &rel)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, "db", http.StatusInternalServerError)
		return
	}
	path := filepath.Join(uploadRoot, rel)
	data, err := os.ReadFile(path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Cache-Control", "public, max-age=3600")
	if r.Method == http.MethodHead {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.WriteHeader(http.StatusOK)
		return
	}
	_, _ = w.Write(data)
}

func writeJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
