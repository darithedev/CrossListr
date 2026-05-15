# CrossListr

This repository is a full-stack **cross-listing / inventory** app built with PostgreSQL, Express, React + Vite, and Node. **Authentication** uses **JWT** (Bearer tokens) and **bcrypt**-hashed passwords: users can **sign up**, **log in**, and the SPA restores the session with **`GET /api/v1/auth/me`**. Once signed in, you see **your items** on the home screen (with the first image on each card), **open an item** for details, **create** a new item, or **edit** an existing one. The item form supports **Cloudinary** uploads (browser widget): images are stored as URLs in **`item_images`** (up to **12** per item, ordered by index). The API can **add**, **list**, and **delete** images; deleting renumbers indexes so they stay contiguous. Items support **metadata** such as title, description, category, condition, price, **source** (e.g. manual vs import), and optional **external_id**. **Deleting an item** via the API is only allowed when the item is still a **draft** with no active listing linkage (**`listings`** table exists for future cross-posting). The repo also includes optional **marketplace emulators** (FakeBay, Fakify, Faketsy) under **`emulators/`** for local dev; the main CrossListr server currently **does not** call those HTTP APIs in application code—**`FAKEBAY_*` / `FAKIFY_*` / `FAKETSY_*`** in Docker are reserved for upcoming platform integration.

 **Project Pitch**: [CrossListr Pitch](https://canva.link/g0ttkozy5jp026z)

 **GitHub Projects**: [Kanban](https://github.com/users/darithedev/projects/5)

## Project stack

- **`frontend/`** — React + Vite (package name `frontend`), UI with **React Bootstrap** and **React Router**; **Cloudinary** upload widget (script in `index.html`)
- **`backend/`** — Node.js + **Express 5** API + **`pg`**, **CORS** enabled; **JWT** auth on protected routes under **`/api/v1`**
- **`migrations/`** — SQL migrations applied with **`postgres-migrations`** (used by Docker **`migrations`** service or run locally)
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

## Docker: Postgres + migrations + app

From the **repository root**, copy [`.env.example`](.env.example) to **`.env`** and set **`POSTGRES_*`**, **`DATABASE_URL`** (hostname **`postgres`** inside Compose), **`JWT_SECRET`**, **`VITE_API_URL`** (see below), and Cloudinary variables if you use uploads.

```bash
docker compose up -d --build
```

- **API** (host): [http://localhost:3000](http://localhost:3000)
- **UI** (host): [http://localhost:5173](http://localhost:5173)

**Backend listen address:** inside Docker, **`LISTEN_HOST=0.0.0.0`** so the container accepts connections. For local **`npm run dev`** without Docker, the server defaults to **`127.0.0.1`** (see [`backend/src/server.js`](backend/src/server.js)).

### Optional marketplace emulators

To run FakeBay / Fakify / Faketsy stacks (published ports such as **`14180`**, **`14280`**, **`14380`**), see [`emulators/README.md`](emulators/README.md). Those docs describe a shared Docker network (**`crosslistr-emulators-integration`**) so the **CrossListr** backend can reach emulator hostnames (e.g. **`http://fakebay-backend:8082`**). Wire that network into Compose when you implement platform clients; **`docker-compose.yml`** already passes **`FAKEBAY_*`**, **`FAKIFY_*`**, and **`FAKETSY_*`** into the backend container for that future step.

## How to install frontend (local)

1. `cd frontend`
2. `npm install`
3. Copy **`frontend/.env.example`** to **`frontend/.env`** and set:
   - **`VITE_API_URL`** — API base including **`/api`** but **without** trailing slash, e.g. `http://127.0.0.1:3000/api` (the app calls paths like **`${VITE_API_URL}/v1/items`**).
   - **`VITE_CLOUDINARY_CLOUD_NAME`** and **`VITE_CLOUDINARY_UPLOAD_PRESET`** if you use image upload.
4. `npm run dev`
5. Open [http://localhost:5173](http://localhost:5173) and go to **`/login`** or **`/signup`**.

## How to install backend (local)

1. `cd backend`
2. `npm install`
3. Copy **`backend/.env.example`** to **`backend/.env`** and set **`PORT`**, **`DATABASE_URL`**, and **`JWT_SECRET`**.
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

Use **`curl`** or Postman with `Authorization: Bearer <token>` for **`/api/v1/items`** and related routes after logging in or signing up.

**Frontend**

- Run the dev server, sign up or log in, then exercise **`/home`**, **`/items/new`**, **`/items/:id`**, and **`/items/:id/edit`**.

## How to use the app

1. **Account** — Open **`/signup`** or **`/login`**. After success you land on **`/home`** with a JWT in **`localStorage`**.
2. **Home** — Lists your item cards (thumbnail = first image). **Select** opens details; **Edit** opens the form.
3. **New / edit item** — Fill in listing fields; use **Cloudinary** to attach images (subject to preset and env). The form syncs metadata and image rows with the API.
4. **Details** — Read-only view of an item and its images.
5. **Logout** — Clears token and user context (home screen).
6. **Not implemented in the UI yet** — Item **delete** exists on the API for draft items only; cross-posting to marketplaces via **`listings`** and the **`emulators/`** stacks is not wired in the application layer.

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

## Docker: app + platform emulators

1. **Start emulators** (creates external network `crosslistr-emulators-integration`):
   ```bash
   docker compose -f emulators/compose.yaml up -d --build
   ```
2. **Start CrossListr** (attaches `backend` + `frontend` to that network):
   ```bash
   docker compose up -d --build
   ```

From the **CrossListr backend** container, HTTP clients can use:

| Target | URL |
|--------|-----|
| FakeBay auth | `http://fakebay-backend:8081` |
| FakeBay API | `http://fakebay-backend:8082` |
| FakeBay UI (internal) | `http://fakebay-frontend:80` |
| Fakify API | `http://fakify-backend:8080` |
| Fakify UI | `http://fakify-frontend:80` |
| Faketsy auth + session | `http://faketsy-backend:8081` |
| Faketsy API | `http://faketsy-backend:8082` |
| Faketsy UI | `http://faketsy-frontend:80` |

Env vars wired in [docker-compose.yml](docker-compose.yml): `FAKEBAY_AUTH_URL`, `FAKEBAY_API_URL`, `FAKIFY_API_URL`, `FAKETSY_API_URL`.

The **browser** on your machine uses published ports: emulators [as listed in emulators/README](emulators/README.md); CrossListr UI [http://localhost:5173](http://localhost:5173), API [http://localhost:3000](http://localhost:3000).

**Backend listen address:** set `LISTEN_HOST=0.0.0.0` in Docker (default in compose). Local `node` without Docker still defaults to `127.0.0.1` in [backend/src/server.js](backend/src/server.js).

## Local dev (no Docker)

See [emulators/README.md](emulators/README.md) and run `backend` / `frontend` with npm as usual.

### Use of AI

This README was drafted with AI assistance, using a README template from another project as structural guidance and filling in details from this repository’s source files and migrations.

