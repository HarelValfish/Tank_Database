# ARMOR/DB — Israeli Tank Database

A premium, tactical full-stack application for browsing and cataloguing Israeli armor.
Dark-mode HUD aesthetic, targeting-reticle cards, staggered grid reveals, and seamless
layout-morphing detail views.

> **Note:** Educational / reference project. Imagery is illustrative placeholder content.

## Stack

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 18 + Vite, Tailwind CSS, Framer Motion, Lucide icons  |
| Backend  | Node.js + Express (ES modules)                              |
| Database | MongoDB + Mongoose                                          |

## Project Structure

```
Tank_Database/
├── backend/
│   ├── config/db.js              # Mongoose connection
│   ├── models/Tank.js            # Tank schema (+ embedded specifications)
│   ├── controllers/tankController.js
│   ├── routes/tankRoutes.js
│   ├── server.js                 # Express app + middleware + boot
│   ├── seed.js                   # Optional starter data
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/           # Dashboard, TankCard, TankDetail, AddTankForm, Header, FilterBar, SkeletonCard
    │   ├── context/ToastContext.jsx
    │   ├── lib/api.js            # API client
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    ├── vite.config.js            # proxies /api → :5000
    └── .env.example
```

## Prerequisites

- **Node.js 18+**
- **MongoDB** — either:
  - a local server (`mongod`) running on `mongodb://127.0.0.1:27017`, or
  - a free **MongoDB Atlas** cluster (get the `mongodb+srv://…` connection string).

---

## 1 · Backend setup

```bash
cd backend
npm install

# Create your environment file from the template:
cp .env.example .env
```

Open `backend/.env` and set your connection string:

```ini
# Local MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/tank_database

# — or — MongoDB Atlas (replace user/password/cluster)
# MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/tank_database?retryWrites=true&w=majority

PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

Seed the database with starter tanks (optional but recommended):

```bash
npm run seed
```

Start the API:

```bash
npm run dev      # auto-restarts on file changes (node --watch)
# or
npm start
```

You should see `✔  MongoDB connected …` and `✔  API running → http://localhost:5000`.
Check `http://localhost:5000/api/health` to confirm.

---

## 2 · Frontend setup

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**).

> The Vite dev server proxies all `/api/*` requests to the backend on port 5000,
> so no CORS configuration is needed during development. If you deploy the API
> elsewhere, copy `frontend/.env.example` to `.env` and set `VITE_API_URL`.

---

## API Reference

| Method | Endpoint                   | Description                                   |
| ------ | -------------------------- | --------------------------------------------- |
| GET    | `/api/health`              | Health check                                  |
| GET    | `/api/tanks`               | List tanks. Query: `search`, `variant`, `era` |
| GET    | `/api/tanks/meta/filters`  | Distinct variants + era buckets for dropdowns |
| GET    | `/api/tanks/:id`           | Single tank                                   |
| POST   | `/api/tanks`               | Create a tank                                 |

### Tank shape

```json
{
  "tankName": "Merkava",
  "variant": "Mk 4 M Windbreaker",
  "armament": "120 mm MG253 smoothbore gun",
  "description": "…",
  "serviceTime": "2004–Present",
  "imageUrl": "https://… or data:image/…",
  "history": "…",
  "specifications": {
    "weight": "65 tonnes",
    "crewSize": "4",
    "speed": "64 km/h"
  }
}
```

---

## Features

- **Dashboard gallery** — staggered grid reveal, hover scale + scanline sweep, reticle corner brackets.
- **Search & filters** — debounced keyword search plus Variant / Era dropdowns sourced from live data.
- **Detail view** — Framer Motion shared-layout morph from card → full HUD panel with spec cards and history.
- **Add unit** — slide-over form with client-side validation, live image preview, and success/error toasts.
- **Feedback** — loading skeletons, error/empty states with reconnect, animated toast notifications.

## Docker & CI/CD

### Run the whole stack in containers

```bash
docker compose up --build
# frontend → http://localhost:8080  (nginx serves the SPA and proxies /api → backend)
```

This starts MongoDB, the API, and the nginx-served frontend on one network. Swap
the local `mongo` service for an Atlas `MONGO_URI` in production.

### GitHub Actions pipeline (`.github/workflows/ci-cd.yml`)

Runs on every push / PR to `main`, with four jobs:

| Job | When | What it does |
| ------ | --------------- | ------------------------------------------------------------ |
| **test** | every run | `npm test` (backend smoke tests) + `npm run build` (frontend) |
| **build** | every run | Builds both Docker images to catch Dockerfile breakage (no push) |
| **push** | `main` only | Builds + pushes images to **GHCR** (`ghcr.io/harelvalfish/tank-db-{backend,frontend}`), tagged `latest` + short SHA |
| **deploy** | `main` only | **Placeholder** — gated by the `production` environment; prints the published image names and TODO steps |

**Wiring up the real deploy** — edit the `deploy` job and add the matching repo secrets:
- SSH to a server: `ssh $HOST 'cd /app && docker compose pull && docker compose up -d'`
- PaaS deploy hook: `curl -X POST "$DEPLOY_HOOK_URL"`

**Notes:**
- The `push` job uses the built-in `GITHUB_TOKEN` — no extra secrets needed for GHCR.
- First publish creates a **private** package; make it public (or pull with a token) for deploys.
- Add **required reviewers** to the `production` environment (repo Settings → Environments) to turn the deploy into a manual approval gate.

## Local-only AI bulk importer (optional)

Add many vehicles at once from a prompt (e.g. *"the Leopard 2 family"*) instead of
typing each field. It's **deliberately local-only**: the routes and UI are gated behind
env flags and are **never present in a production build**, so there's nothing to abuse.

Two providers (set `AI_PROVIDER`):
- **`groq`** (default, recommended) — free hosted ~70B model. Far better factual accuracy
  than a small local model, zero local resource use, $0 within Groq's free tier. Runs only
  from your machine, so it stays local-only.
- **`ollama`** — fully local (no data leaves your Mac), but a small model is weaker on facts.

**Setup — Groq (recommended):**

1. Get a free API key at <https://console.groq.com/keys>.
2. Configure `backend/.env`:

```ini
ENABLE_AI_IMPORT=true
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

```ini
# frontend/.env
VITE_ENABLE_AI_IMPORT=true
```

**Setup — Ollama (fully local alternative):**

```bash
brew install --cask ollama-app && open -a Ollama
ollama pull qwen2.5:7b          # ~4.4 GB
```
```ini
# backend/.env
ENABLE_AI_IMPORT=true
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:7b
```

Restart both dev servers after changing env. An **"AI Import"** button appears in the header.

**Flow:** type a prompt → the model returns a batch → **review & edit each vehicle**
in the preview grid (images auto-fetched from Wikipedia) → **Save All**. Because local +
production share one Atlas database, saved vehicles appear on the live site immediately.

| Endpoint | Gated by | Notes |
| -------- | -------- | ----- |
| `POST /api/tanks/generate` | `ENABLE_AI_IMPORT` | Prompt → structured tanks (no DB write) |
| `POST /api/tanks/bulk`     | `ENABLE_AI_IMPORT` | Inserts the reviewed batch |

> ⚠️ A local 7B model is good but not perfect on exact specs — the **review/edit step
> before saving** is the guardrail. Keep both flags **unset in production** (the default).

## Troubleshooting

- **`MONGO_URI is not defined`** → you didn't create `backend/.env` (run `cp .env.example .env`).
- **`MongoDB connection error`** → `mongod` isn't running, or your Atlas IP allowlist / credentials are wrong.
- **Frontend can't load tanks** → make sure the backend is running on port 5000 first.
```

Built with a tactical command-center aesthetic. 🎯
