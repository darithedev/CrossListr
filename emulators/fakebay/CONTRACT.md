# FakeBay — HTTP contract (eBay sandbox–shaped emulator)

CrossListr and tests should depend on **this document**, not on undocumented eBay behavior. FakeBay may deliberately simplify; divergences are called out below.

## Base URLs (Docker defaults)

| Surface | Published host port | In-container listener | Purpose |
|--------|---------------------|----------------------|---------|
| Auth   | `14181` → `8081`    | `FAKEBAY_AUTH_ADDR`  | Authorization / browser redirect |
| API    | `14182` → `8082`    | `FAKEBAY_API_ADDR`   | Token exchange + REST (Bearer) |

On the shared integration network, other containers typically use `http://fakebay-backend:8081` (auth) and `http://fakebay-backend:8082` (API).

## Environment (OAuth client)

| Variable | Default (dev) | Meaning |
|----------|---------------|---------|
| `FAKEBAY_CLIENT_ID` | `dev-fakebay-client` | `client_id` for authorize + Basic auth user on token |
| `FAKEBAY_CLIENT_SECRET` | `dev-fakebay-secret` | Basic auth password on token |
| `FAKEBAY_CLIENT_DISPLAY_NAME` | `CrossListr` | Shown on the OAuth **consent** screen (third-party app name). |
| `FAKEBAY_ALLOWED_REDIRECT_URIS` | *(empty)* | Comma-separated **exact** `redirect_uri` values. If empty, any `http`/`https` absolute URL is allowed (emulator-only). |
| `DATABASE_URL` | *(required in Docker)* | Postgres DSN for FakeBay users table (e.g. `postgres://fakebay:fakebay@fakebay-postgres:5432/fakebay?sslmode=disable`). |

## End-user login (auth listener)

FakeBay stores users in Postgres (`fakebay_users`). The backend seeds one dev account if the table is empty:

| Email | Password |
|-------|----------|
| `demo@fakebay.local` | `demo` |

### `GET /login`

Optional query: `return_to` — relative URL whose path must be `/oauth2/authorize` (and optional query). Used after successful sign-in.

Returns **HTML** sign-in form (`POST /login`).

### `POST /login`

Form fields: `email`, `password`, `return_to` (same rules as above). On success, sets an **HttpOnly** session cookie (`fakebay_sid`) and redirects to `return_to`.

### `GET /logout`

Clears the session cookie and redirects to `/login?signed_out=1`.

## FakeBay UI session (JSON, auth listener)

For the React UI on port **14180** (or other origins listed in **`FAKEBAY_UI_ORIGINS`**), the auth server exposes JSON endpoints that set the same **`fakebay_sid`** cookie as **`POST /login`**. Browsers send that cookie on cross-origin requests to the auth port when using `fetch(..., { credentials: 'include' })` and CORS allows the UI origin.

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/session/login` | Body: `{"email":"","password":""}` → `200` `{"email":…}` and session cookie |
| `POST` | `/api/v1/session/logout` | Clears session → `200` `{"ok":true}` |
| `GET` | `/api/v1/session/me` | `200` `{"email":"","userId":0}` or `401` |

Preflight `OPTIONS` is supported for these paths.

## Authorization code flow

### `GET /oauth2/authorize` (auth listener)

If the browser has **no** valid FakeBay session, responds with **302** to `/login?return_to=<url-encoded authorize URL>`.

If the user **is** signed in, returns **HTML** **consent** (`POST /oauth2/consent`): the app name shown is **`FAKEBAY_CLIENT_DISPLAY_NAME`** (default **CrossListr**). The user can **Agree and continue** or **Cancel**.

Query parameters (subset enforced by FakeBay):

| Param | Required | Notes |
|-------|----------|-------|
| `response_type` | yes | Must be `code`. |
| `client_id` | yes | Must match `FAKEBAY_CLIENT_ID`. |
| `redirect_uri` | yes | Absolute `http` or `https` URL. Must match token step exactly. If allowlist is set, must be listed in `FAKEBAY_ALLOWED_REDIRECT_URIS`. |
| `scope` | no | Ignored for MVP (may be echoed in future). |
| `state` | no | Returned unchanged on success and on redirect-style errors. |

**Success (after consent):** the user’s browser is redirected (`302`) to `redirect_uri` with query `code` (opaque, URL- and shell-safe prefix `fbac_`) and `state` (if provided). The authorization code is bound to the signed-in user; access tokens use that user’s email as OAuth **`sub`** in `whoami`.

**Errors (when `redirect_uri` is valid):** HTTP 302 to `redirect_uri` with `error`, `error_description`, and optional `state` (OAuth 2.0 style). User may receive **`access_denied`** if they cancel on the consent screen.

**Errors (no usable redirect):** HTTP 400 with JSON `error` / `error_description`.

### `POST /oauth2/consent` (auth listener)

Browser form from the consent page. Validates session + CSRF, then either redirects with a `code` (**approve**) or with **`access_denied`** (**deny**).

### `POST /identity/v1/oauth2/token` (API listener)

- **Headers:** `Authorization: Basic base64(client_id:client_secret)` (must match env).
- **Body:** `application/x-www-form-urlencoded`.

**`grant_type=authorization_code`**

| Field | Required |
|-------|----------|
| `grant_type` | `authorization_code` |
| `code` | yes (from authorize redirect) |
| `redirect_uri` | yes (must match the authorize request) |

**Success JSON (shape aligned with eBay user tokens):**

```json
{
  "access_token": "v^1.1#i#...",
  "expires_in": 7200,
  "refresh_token": "v^1.1#r#...",
  "token_type": "User Access Token"
}
```

**`grant_type=refresh_token`**

| Field | Required |
|-------|----------|
| `grant_type` | `refresh_token` |
| `refresh_token` | yes |

**Success:** JSON with new `access_token`, `expires_in`, `token_type` (refresh token is not rotated in MVP).

**Error JSON:** HTTP 4xx with `error` and `error_description`, e.g. `invalid_client`, `invalid_grant`, `invalid_request`, `unsupported_grant_type`.

## Bearer-protected sample route

### `GET /api/v1/oauth/whoami` (API listener)

- **Header:** `Authorization: Bearer <access_token>` from token response.

**Success:** `200` JSON, e.g. `{ "sub": "<user email>", "token_type": "User Access Token", "emulator": "fakebay" }`.

**Failure:** `401` JSON with `invalid_token`.

## CORS

The **API** listener sends permissive dev headers (`Access-Control-Allow-Origin: *`, etc.) and answers `OPTIONS` with `204` for browser `fetch` (e.g. `whoami`). The **auth** listener is intended for **top-level navigation** and **HTML forms** on the auth origin; it does not need broad CORS for the default flow.

## Health

`GET /health` on each listener returns `{"status":"ok","emulator":"fakebay"}`.
