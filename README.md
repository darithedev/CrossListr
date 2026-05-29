# CrossListr

CrossListr is a full-stack **cross-listing / inventory** app built with PostgreSQL, Express, React + Vite, and Node. **Authentication** uses **JWT** (Bearer tokens) and **bcrypt**-hashed passwords: users can **sign up**, **log in**, and the SPA restores the session with **`GET /api/v1/auth/me`**. Once signed in, you manage **inventory** on the home screen (item cards with thumbnails), **create** and **edit** items, and view **item details**. Images upload via the **Cloudinary** browser widget and are stored as URLs in **`item_images`** (up to **12** per item, ordered by index).

The MVP also supports **marketplace connections** and **crosslisting**: connect a **FakeBay** account (OAuth2 against the local FakeBay emulator), then **crosslist** draft items to FakeBay from the item details page. **Profile** shows read-only account fields; **Settings** lists FakeBay, Faketsy, and Fakify connect buttons (FakeBay is wired end-to-end). Optional **marketplace emulators** under **`emulators/`** stand in for eBay-, Shopify-, and Etsy-shaped APIs during local development.

![](/frontend/public/CrossListr-Demo.gif)

## Project Links

**Project Pitch**: [CrossListr Pitch](https://canva.link/g0ttkozy5jp026z)

**GitHub Projects**: [Kanban](https://github.com/users/darithedev/projects/5)

## Project stack

- **`frontend/`** — React + Vite, **React Bootstrap** and **React Router**; **Cloudinary** upload widget (script in `index.html`); pages for auth, home, items, profile, and settings
- **`backend/`** — Node.js + **Express 5** API + **`pg`**, **CORS** enabled; **JWT** auth on protected routes under **`/api/v1`**
- **`migrations/`** — SQL migrations applied with **`postgres-migrations`** (Docker **`migrations`** service or run locally)
- **`emulators/`** — Dev-only HTTP stand-ins for eBay-, Shopify-, and Etsy-shaped APIs (see [`emulators/README.md`](emulators/README.md))

## Authentication (JWT)

- **Sign up** (`POST /api/v1/auth/signup`) returns a **token** and **user** profile; the UI stores the token in **`localStorage`** and sends `Authorization: Bearer <token>` on protected calls.
- **Log in** verifies email/password with **bcrypt** and returns a token (default expiry **1 hour** in code).
- **`GET /api/v1/auth/me`** returns the current user when the token is valid; invalid or missing tokens clear client session.

Set a strong **`JWT_SECRET`** in **`backend/.env`** (see [`backend/.env.example`](backend/.env.example)); without it, auth middleware responds with a configuration error.

## Cloudinary (item images)

Image files are uploaded **from the browser** with Cloudinary’s widget; only **`image_url`** values are sent to CrossListr’s API.

### One-time Cloudinary setup

1. Create a [Cloudinary](https://cloudinary.com/) account (free tier is enough for development).
2. Note your **cloud name** and create an **unsigned** (or signed) **upload preset** appropriate for your security model.
3. In **`frontend/.env`** (local) or in the root **`.env`** used by Docker build args, set:
   - **`VITE_CLOUDINARY_CLOUD_NAME`**
   - **`VITE_CLOUDINARY_UPLOAD_PRESET`**

The upload widget is loaded from Cloudinary’s CDN in [`frontend/index.html`](frontend/index.html).

## FakeBay integration (local dev)

Crosslisting to **FakeBay** requires the FakeBay emulator and OAuth env vars.

### Environment variables

In the repo root **`.env`** (copy from [`.env.example`](.env.example)), set at minimum:

```text
POSTGRES_USER=crosslistr
POSTGRES_PASSWORD=replace_me
POSTGRES_DB=crosslistr_db
DATABASE_URL=postgresql://crosslistr:replace_me@postgres:5432/crosslistr_db
JWT_SECRET=a-string-secret-at-least-256-bits-long
VITE_API_URL=http://localhost:3000/api

FAKEBAY_API_URL=http://fakebay-backend:8082
FAKEBAY_AUTH_PUBLIC_URL=http://localhost:14181
FAKEBAY_CLIENT_ID=dev-fakebay-client
FAKEBAY_CLIENT_SECRET=dev-fakebay-secret
FAKEBAY_REDIRECT_URI=http://localhost:3000/api/v1/connections/fakebay/callback
FRONTEND_URL=http://localhost:5173
VITE_FAKEBAY_AUTH_PUBLIC_URL=http://localhost:14181
```

For **local frontend** (`npm run dev` without Docker), also add **`VITE_FAKEBAY_AUTH_PUBLIC_URL`** (and optionally **`VITE_FAKEBAY_CLIENT_ID`**) to **`frontend/.env`**.

Inside Docker, the backend reaches FakeBay at **`http://fakebay-backend:8082`** on the shared network **`crosslistr-emulators-integration`**. Your browser uses published emulator ports (e.g. **`14181`** for FakeBay OAuth).

### Start emulators, then CrossListr

1. Create the shared Docker network and start FakeBay (or all emulators):

   ```bash
   docker compose -f emulators/compose.yaml up -d --build
   ```

   Or from **`emulators/fakebay/`**: `docker compose up -d --build` (see [`emulators/README.md`](emulators/README.md)).

2. From the **repository root**:

   ```bash
   docker compose up -d --build
   ```

- **API** (host): [http://localhost:3000](http://localhost:3000)
- **UI** (host): [http://localhost:5173](http://localhost:5173)
- **FakeBay OAuth** (browser): [http://localhost:14181](http://localhost:14181) — dev login `demo@fakebay.local` / `demo`

**Backend listen address:** inside Docker, **`LISTEN_HOST=0.0.0.0`** so the container accepts connections. For local **`npm run dev`** without Docker, the server defaults to **`127.0.0.1`** (see [`backend/src/server.js`](backend/src/server.js)).

### Other marketplace emulators

**Fakify** and **Faketsy** appear in Settings UI; **crosslisting** to them returns **501** until implemented. See [`emulators/README.md`](emulators/README.md) for ports and contracts.

## How to install frontend (local)

1. `cd frontend`
2. `npm install`
3. Copy **`frontend/.env.example`** to **`frontend/.env`** and set:
   - **`VITE_API_URL`** — API base including **`/api`** but **without** trailing slash, e.g. `http://127.0.0.1:3000/api` (the app calls paths like **`${VITE_API_URL}/v1/items`**).
   - **`VITE_CLOUDINARY_CLOUD_NAME`** and **`VITE_CLOUDINARY_UPLOAD_PRESET`** if you use image upload.
   - **`VITE_FAKEBAY_AUTH_PUBLIC_URL`** (e.g. `http://localhost:14181`) if you use FakeBay connect.
4. `npm run dev`
5. Open [http://localhost:5173](http://localhost:5173) and go to **`/login`** or **`/signup`**.

## How to install backend (local)

1. `cd backend`
2. `npm install`
3. Copy **`backend/.env.example`** to **`backend/.env`** and set **`PORT`**, **`DATABASE_URL`**, **`JWT_SECRET`**, and FakeBay vars if testing crosslisting (use **`localhost`** URLs and published emulator ports when not on the Docker network).
4. Ensure PostgreSQL is running and **migrations** have been applied (see [Database setup](#database-setup)).
5. `npm run dev` (nodemon). JSON API is mounted under **`/api/v1`**.

## Database setup

1. Start PostgreSQL and create a database (or rely on **`ensureDatabaseExists`** when using the migrate script with sufficient permissions).
2. From **`migrations/`**:
   - `npm install`
   - Set **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, **`POSTGRES_DB`**, and **`DB_HOST`** (e.g. **`localhost`** for local Postgres).
   - Run: `npm run migrate`
3. In **`backend/.env`**, set **`DATABASE_URL`**, for example:

   ```text
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/your_database
   PORT=3000
   ```

4. Start the backend. If the database is unreachable, startup exits after the health check in [`backend/src/server.js`](backend/src/server.js).

Migrations include **`marketplaces`**, **`marketplace_connections`**, and **`listings`** tables (seeded marketplace names: `fakebay`, `faketsy`, `fakify`).

## API routes

Base URL (local): `http://127.0.0.1:3000` (or your **`PORT`**). Versioned JSON routes live under **`/api/v1`**.

**Auth**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/signup` | Register. Body: `{ name, phone_number, email, password }`. Returns `{ token, user }`. Password stored bcrypt-hashed. |
| `POST` | `/api/v1/auth/login` | Log in. Body: `{ email, password }`. Returns `{ token, user }`. |
| `GET` | `/api/v1/auth/me` | Current user. **Bearer** required. Returns `{ user }`. |

**Items** (all routes below require **Bearer** token; resources are scoped to the authenticated user)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/items` | All items for the user; rows are **joined** with **`item_images`** (multiple rows per item; sort by item id and image index). |
| `POST` | `/api/v1/items` | Create item. Body: `{ title, description, category, condition, price, source, external_id? }`. Required fields: title, description, category, condition, price, source. |
| `GET` | `/api/v1/items/:id` | One item with **`images`**: `[{ image_id, url, index }, …]`. |
| `PUT` | `/api/v1/items/:id` | Update item. Body: `{ title, description, category, condition, price, source, external_id? }`. Title, description, and price required. |
| `DELETE` | `/api/v1/items/:id` | Delete item only if **`status = 'draft'`**; otherwise **409** (“listings” constraint). |
| `GET` | `/api/v1/items/:id/images` | List `{ image_url, index }` rows. |
| `POST` | `/api/v1/items/:id/images` | Add image. Body: `{ image_url, index_number }`. Index **0–11** (max 12 images). |
| `DELETE` | `/api/v1/items/:id/images/:image_id` | Delete image; **409** if item is not draft; reindexes remaining images. |
| `GET` | `/api/v1/items/:id/listings` | Listings for the item: `[{ marketplace, status, external_id }, …]`. |
| `POST` | `/api/v1/items/:id/crosslist/:marketplace` | Crosslist to **`fakebay`**, **`faketsy`**, or **`fakify`**. **FakeBay**: requires connection, posts to FakeBay seller API, inserts **`listings`** row, sets item **`status`** to **`listed`**. **409** if already listed; **403** if marketplace not connected. **501** for Faketsy/Fakify (not implemented). |

**Connections**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/connections` | Connected marketplaces for the user. **Bearer** required. Returns `[{ name: "fakebay" }, …]`. |
| `GET` | `/api/v1/connections/:marketplace/callback` | OAuth callback (browser redirect). Exchanges code for tokens, stores **`marketplace_connections`**, redirects to **`/settings`**. **`state`** is a JWT carrying **`userId`**. |

**Other**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server + PostgreSQL connectivity (**not** under `/api`). |

CORS is enabled for browser clients.

## How to test

**Backend (automated)**

- `cd backend` — `npm test` is currently a placeholder (no suite yet).

**Frontend (automated)**

- No test suite documented yet.

**Backend (manual)**

```bash
curl -s http://127.0.0.1:3000/health
```

After login, use **`curl`** or Postman with `Authorization: Bearer <token>` for protected routes. Example flow:

```bash
# Log in
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# List connections (replace TOKEN)
curl -s http://localhost:3000/api/v1/connections \
  -H "Authorization: Bearer TOKEN"

# Crosslist to FakeBay (replace TOKEN and ITEM_ID)
curl -s -X POST http://localhost:3000/api/v1/items/ITEM_ID/crosslist/fakebay \
  -H "Authorization: Bearer TOKEN"
```

**Frontend**

1. Sign up or log in at **`/signup`** or **`/login`**.
2. **Profile** — from Home, open Profile; confirm name, email, phone.
3. **Settings** — connect FakeBay (OAuth); button shows connected after redirect.
4. Create or open an item; on **Item details**, use **Crosslist to Fakebay** when connected.
5. Confirm marketplace tags and listing on the FakeBay emulator UI.

## How to use the app

1. **Account** — Open **`/signup`** or **`/login`**. After success you land on **`/home`** with a JWT in **`localStorage`**.
2. **Home** — Lists your item cards (thumbnail = first image). Click a card for details; use **Edit** on the card for the form. **Profile** and **Logout** are in the header actions.
3. **Profile** (`/profile`) — Read-only name, email, and phone; links to Home and Settings.
4. **Settings** (`/settings`) — Connect **FakeBay** (redirects to emulator OAuth). Faketsy and Fakify buttons are present; only FakeBay OAuth is fully wired.
5. **New / edit item** — Fill listing fields; use **Cloudinary** for images. New items start as **draft**.
6. **Details** (`/items/:id`) — View item and images; **List on marketplaces** shows crosslist actions or active listing tags. **Crosslist to Fakebay** requires a FakeBay connection; unconnected marketplaces link to Settings.
7. **Logout** — Clears token and user context.

**Not in the UI yet**

- Item **delete** exists on the API for draft items only (no delete button in the SPA).
- Crosslisting to **Faketsy** and **Fakify** (API returns **501**).

**Example `GET /api/v1/items/:id` response shape:**

```json
{
  "id": "1",
  "title": "Vintage camera",
  "description": "…",
  "category": "Electronics",
  "condition": "used",
  "price": "49.99",
  "source": "manual",
  "external_id": null,
  "created_at": "2026-05-15T12:00:00.000Z",
  "updated_at": "2026-05-15T12:00:00.000Z",
  "images": [
    { "image_id": 1, "url": "https://res.cloudinary.com/…", "index": 0 }
  ]
}
```

**Example `POST /api/v1/items/:id/crosslist/fakebay` success:**

```json
{
  "marketplace": "fakebay",
  "status": "listed",
  "external_id": "42"
}
```

### Use of AI

This README was drafted with AI assistance, using a README template from another project as structural guidance and filling in details from this repository’s source files and migrations.
