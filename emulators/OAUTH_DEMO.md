# OAuth demo (FakeBay)

Step-by-step instructions for the **FakeBay** eBay-shaped OAuth flow in Docker. The normative HTTP contract (paths, errors, fields) is **[`fakebay/CONTRACT.md`](fakebay/CONTRACT.md)**.

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

If the UI looks like an old scaffold (no OAuth sections), rebuild the frontend:

```bash
docker compose build --no-cache fakebay-frontend
docker compose up -d
```

## URLs (host)

| What | URL / port |
|------|------------|
| SPA demo | [http://localhost:14180](http://localhost:14180) |
| Auth listener (`/oauth2/authorize`) | `http://localhost:14181` |
| API listener (token + `whoami`) | `http://localhost:14182` |

Use the **same hostname** for the whole flow (`localhost` vs `127.0.0.1`): the **`redirect_uri` must match character-for-character** between authorize and token requests.

## Browser flow

1. Open **http://localhost:14180**
2. Under **1. Authorization**, click **Sign in with FakeBay** (or **Open in new tab**).
3. FakeBay responds with **HTTP 302** to your `redirect_uri` (default: `/oauth/callback` on the SPA) with query parameters **`code`** and **`state`** (if you sent one). There is no JSON body on the authorize URL; the `code` is delivered only via that redirect.
4. On the callback page, copy the **authorization `code`** (or use the pre-filled example). Current FakeBay builds use URL-safe codes with prefix **`fbac_`**. Each code is **single-use** and expires after about **10 minutes**.

Do not put **`client_secret`** in browser JavaScript; the next step is meant for a **trusted client** (your backend, or a local `curl`).

## Dev OAuth client

Defaults from **`emulators/fakebay/compose.yaml`**:

| | Value |
|---|--------|
| `client_id` | `dev-fakebay-client` |
| `client_secret` | `dev-fakebay-secret` |

Override with environment variables **`FAKEBAY_CLIENT_ID`** and **`FAKEBAY_CLIENT_SECRET`** if you change them in Compose.

## Exchange the code for tokens (`curl`)

Use real **curl** on Windows: call **`curl.exe`**, not **`curl`** (PowerShell aliases `curl` to `Invoke-WebRequest`, which will not work).

Replace `PASTE_CODE` with the `code` from the callback URL. Replace `redirect_uri` if your authorize step used a different absolute URL.

**PowerShell — one line:**

```powershell
curl.exe -sS -u 'dev-fakebay-client:dev-fakebay-secret' -X POST 'http://localhost:14182/identity/v1/oauth2/token' -H 'Content-Type: application/x-www-form-urlencoded' --data-urlencode 'grant_type=authorization_code' --data-urlencode 'code=PASTE_CODE' --data-urlencode 'redirect_uri=http://localhost:14180/oauth/callback'
```

**PowerShell — multiple lines** (line continuation is a backtick `` ` ``, not `\`):

```powershell
curl.exe -sS -u 'dev-fakebay-client:dev-fakebay-secret' `
  -X POST 'http://localhost:14182/identity/v1/oauth2/token' `
  -H 'Content-Type: application/x-www-form-urlencoded' `
  --data-urlencode 'grant_type=authorization_code' `
  --data-urlencode 'code=PASTE_CODE' `
  --data-urlencode 'redirect_uri=http://localhost:14180/oauth/callback'
```

**Bash / Git Bash** (backslash continuation is fine):

```bash
curl -sS -u 'dev-fakebay-client:dev-fakebay-secret' -X POST 'http://localhost:14182/identity/v1/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=PASTE_CODE' \
  --data-urlencode 'redirect_uri=http://localhost:14180/oauth/callback'
```

Success response is JSON with **`access_token`**, **`refresh_token`**, **`expires_in`**, **`token_type`**.

### If you see `invalid_grant`

- **`redirect_uri`** in `curl` does not exactly match the value used in **authorize** (including scheme, host, port, path).
- The **code was already used** (run authorize again).
- The **code expired** (run authorize again).
- **`client_id`** in Basic auth does not match the **`client_id`** from the authorize URL.

## Try Bearer auth (optional)

On the SPA, section **3. Try Bearer API**: paste **`access_token`** from the JSON, then call **`GET /api/v1/oauth/whoami`** on port **14182**.

From PowerShell:

```powershell
curl.exe -sS -H 'Authorization: Bearer PASTE_ACCESS_TOKEN' 'http://localhost:14182/api/v1/oauth/whoami'
```

## From other containers (CrossListr)

On the **`crosslistr-emulators-integration`** network, use service DNS (see **[`README.md`](README.md)**), e.g. `http://fakebay-backend:8081` for auth and `http://fakebay-backend:8082` for the API — not `localhost`.
