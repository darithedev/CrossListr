# CrossListr

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

