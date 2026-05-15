# OAuth demo (FakeBay)

The **shopper** UI (sign in, browse cross-listed postings) lives at **[/](http://localhost:14180/)** with listings under **`/listings`**. This document is only for **`/demo`** — the developer OAuth playground (CrossListr-style client, token exchange).

The normative HTTP contract is **[`fakebay/CONTRACT.md`](fakebay/CONTRACT.md)**.

## Prerequisites

- Docker with Compose v2
- Optional shared network for CrossListr (FakeBay `compose.yaml` attaches to it):

```bash
docker network create crosslistr-emulators-integration
```

If that network already exists, Compose will reuse it.

## Start FakeBay

From the repo root (or `emulators/fakebay`):

```bash
cd emulators/fakebay
docker compose up --build
```

Wait until **fakebay-backend** and **fakebay-frontend** are healthy.

If the UI looks stale, rebuild the frontend:

```bash
docker compose build --no-cache fakebay-frontend
docker compose up -d
```

## URLs (host)

| What | URL / port |
|------|------------|
| SPA home | [http://localhost:14180](http://localhost:14180) |
| **OAuth demo** | [http://localhost:14180/demo](http://localhost:14180/demo) |
| Auth listener (`/oauth2/authorize`, `/login`, consent) | `http://localhost:14181` |
| API listener (token + `whoami`) | `http://localhost:14182` |

Use the **same hostname** for the whole flow (`localhost` vs `127.0.0.1`): the **`redirect_uri` must match character-for-character** between authorize and token requests.

The bundled demo sets:

`redirect_uri` = **`http://localhost:14180/demo/oauth/callback`** (path **`/demo/oauth/callback`**).

## Dev FakeBay account

After migrations, the backend seeds one user if the table is empty:

| Email | Password |
|-------|----------|
| `demo@fakebay.local` | `demo` |

## Browser flow

1. Open **http://localhost:14180/demo** (or use **OAuth demo** in the nav).
2. Click **Sign in with FakeBay** — your browser goes to **`/oauth2/authorize`** on port **14181**.
3. If you are not logged in, FakeBay shows **Sign in to FakeBay**. Use the dev account above, then you return to authorize.
4. FakeBay shows **Approve access**: **CrossListr** (or `FAKEBAY_CLIENT_DISPLAY_NAME`) wants access. Choose **Agree and continue** or **Cancel**.
5. On success, **HTTP 302** sends you to **`/demo/oauth/callback`** on port **14180** with **`code`** and **`state`** in the query string. Each **`code`** is **single-use** and expires after about **10 minutes** (URL-safe prefix **`fbac_`**).

Do not put **`client_secret`** in browser JavaScript; token exchange is for a **trusted client** (your backend, or local **`curl.exe`** on Windows).

## Dev OAuth client

Defaults from **`emulators/fakebay/compose.yaml`**:

| | Value |
|---|--------|
| `client_id` | `dev-fakebay-client` |
| `client_secret` | `dev-fakebay-secret` |

## Exchange the code for tokens (`curl`)

On Windows use **`curl.exe`** (not **`curl`**, which is `Invoke-WebRequest` in PowerShell).

Replace `PASTE_CODE` with the `code` from the callback URL. **`redirect_uri`** must match the demo (including **`/demo/oauth/callback`**):

**PowerShell — one line:**

```powershell
curl.exe -sS -u 'dev-fakebay-client:dev-fakebay-secret' -X POST 'http://localhost:14182/identity/v1/oauth2/token' -H 'Content-Type: application/x-www-form-urlencoded' --data-urlencode 'grant_type=authorization_code' --data-urlencode 'code=PASTE_CODE' --data-urlencode 'redirect_uri=http://localhost:14180/demo/oauth/callback'
```

**PowerShell — multiple lines** (continuation is backtick `` ` ``):

```powershell
curl.exe -sS -u 'dev-fakebay-client:dev-fakebay-secret' `
  -X POST 'http://localhost:14182/identity/v1/oauth2/token' `
  -H 'Content-Type: application/x-www-form-urlencoded' `
  --data-urlencode 'grant_type=authorization_code' `
  --data-urlencode 'code=PASTE_CODE' `
  --data-urlencode 'redirect_uri=http://localhost:14180/demo/oauth/callback'
```

**Bash / Git Bash:**

```bash
curl -sS -u 'dev-fakebay-client:dev-fakebay-secret' -X POST 'http://localhost:14182/identity/v1/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=PASTE_CODE' \
  --data-urlencode 'redirect_uri=http://localhost:14180/demo/oauth/callback'
```

Success response includes **`access_token`**, **`refresh_token`**, **`expires_in`**, **`token_type`**. **`GET /api/v1/oauth/whoami`** returns **`sub`** = the FakeBay user’s email (e.g. `demo@fakebay.local`).

### If you see `invalid_grant`

- **`redirect_uri`** in `curl` does not exactly match the **authorize** request.
- The **code was already used** or **expired**.

## From other containers (CrossListr)

On **`crosslistr-emulators-integration`**, use service DNS (see **[`README.md`](README.md)**): `http://fakebay-backend:8081` (auth) and `http://fakebay-backend:8082` (API).
