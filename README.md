# Pagebrief — AI Web Scraper

Paste a public webpage URL to get a short AI summary. The **React/Vite frontend** and **Node/Express backend** are independent projects. Deploy the frontend on **Vercel** and the backend on **Render**. Summaries use a server-side Groq key on its free plan; no paid OpenAI API key is used.

Public repository: https://github.com/duttaanirban/pagebrief

## Folder structure

```text
pagebrief/
├── frontend/                 # React UI → Vercel
│   ├── src/
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json
├── backend/                  # Express API → Render
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── render.yaml               # Optional Render Blueprint
├── package.json              # Convenience commands only
└── README.md
```

The source has been migrated from the earlier combined Cloudflare app. The new Vercel/Render version requires the manual deployments below; its new live URLs are not assigned yet.

## Run locally

Install Node.js **22.13 or newer**. Clone this repository, then use **two terminals**. On Windows PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks the npm shim.

### Terminal 1: backend

```sh
cd pagebrief/backend
npm ci
```

Copy `backend/.env.example` to **`backend/.env`**, beside the backend's `package.json`:

```sh
# macOS/Linux, from backend/
cp .env.example .env
```

```powershell
# Windows PowerShell, from backend/
Copy-Item .env.example .env
```

Edit `backend/.env`:

```dotenv
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=qwen/qwen3.8-27b
PORT=3001
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173
```

Get a free key at https://console.groq.com/keys. Keep the account on its free plan. Models and quotas can change; choose an enabled model from https://console.groq.com/docs/rate-limits. `GROQ_MODEL` is optional and defaults to the value above.

```sh
npm run dev
```

The backend listens on **http://localhost:3001**. Open **http://localhost:3001/health** to check it; it returns `{"status":"ok"}`. The existing local API key was moved into `backend/.env` during the migration. Do not create a root `.env` or put the key in the frontend.

### Terminal 2: frontend

```sh
cd pagebrief/frontend
npm ci
```

Copy `frontend/.env.example` to **`frontend/.env`** using `cp .env.example .env` or PowerShell's `Copy-Item .env.example .env`.

```dotenv
VITE_API_URL=http://localhost:3001
```

```sh
npm run dev
```

Open **http://localhost:5173**, paste a public URL, and click **Summarize**. Restart the corresponding server after changing its `.env`.

`VITE_API_URL` is the backend **origin**, without `/api/summarize` or a trailing slash. This URL is public browser configuration. **Never put `GROQ_API_KEY` in a `VITE_` variable**: those values are bundled into the frontend.

## Manual deployment: Vercel + Render

Use the same GitHub repository for both services. Each provider builds only its selected folder. No Cloudflare setup is needed.

### 1. Create the frontend on Vercel

1. Sign in at https://vercel.com/new and import **duttaanirban/pagebrief**.
2. Set **Root Directory** to **`frontend`**.
3. Set **Framework Preset** to **Vite**.
4. Use **Install Command** `npm ci`, **Build Command** `npm run build`, and **Output Directory** `dist`. The included `frontend/vercel.json` sets these commands.
5. Deploy, then copy its stable production URL, for example `https://your-project.vercel.app`. This first deploy displays the UI; summaries connect after step 3 below.

Use the production domain shown by your actual Vercel project; the example URL is not an existing deployment.

### 2. Create the backend on Render

1. Sign in at https://dashboard.render.com and choose **New → Web Service**.
2. Connect the same **duttaanirban/pagebrief** GitHub repository and select branch **main**.
3. Enter these settings:

| Render setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Runtime / Language | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |
| Health Check Path | `/health` |

4. Add environment variables in Render:

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `22.14.0` or a newer supported Node 22 release |
| `NODE_ENV` | `production` |
| `GROQ_API_KEY` | Your free Groq API key |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` (or another model enabled on your free account) |
| `FRONTEND_URL` | Your actual Vercel production origin, e.g. `https://your-project.vercel.app` |

Render provides `PORT` automatically. The backend binds to `0.0.0.0` and uses that port. Do not upload `.env`: set values in Render's dashboard.

5. Deploy. Copy the actual backend URL assigned by Render, for example `https://your-backend.onrender.com`.
6. Visit `https://your-backend.onrender.com/health` and check for `{"status":"ok"}`.

Alternatively, use **New → Blueprint** with this repository. The root `render.yaml` contains the same backend settings and prompts for `GROQ_API_KEY` and `FRONTEND_URL`. It creates only the backend on Render; Vercel still hosts the frontend.

### 3. Connect Vercel to Render

1. In Vercel, open **Project → Settings → Environment Variables**.
2. Add **`VITE_API_URL`** with your actual Render backend origin, for example `https://your-backend.onrender.com`. Enable it for **Production**.
3. **Redeploy the frontend** from the Deployments tab. Vite reads this variable at build time, so adding it after a build does not change an already deployed bundle.
4. Open the Vercel production URL and summarize `https://example.com`.

Keep `FRONTEND_URL` on Render exactly equal to the browser's Vercel origin (scheme and hostname, no path or trailing slash). You may list multiple trusted origins separated by commas. A Vercel preview uses a different origin; explicitly add it to Render if you need to test that preview. Do not use a wildcard CORS origin.

### Troubleshooting deployment

- **Cannot reach the summary server:** verify `VITE_API_URL`, redeploy Vercel after changing it, and open Render's `/health` URL. Render's free backend can sleep when idle and may need time to start; the UI waits up to two minutes.
- **Frontend origin is not allowed / CORS error:** update Render's `FRONTEND_URL` to the exact Vercel domain you're viewing, then let Render restart/redeploy.
- **Summaries aren't configured:** set `GROQ_API_KEY` on **Render**, not Vercel.
- **AI quota exhausted:** wait for the free quota to reset. No paid fallback is used.
- **Build cannot find package.json:** ensure the provider's root is `frontend` or `backend`, not `pagebrief/frontend` or `pagebrief/backend`. The GitHub repository itself is already the `pagebrief` project root.

Provider references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Node/Express on Render](https://render.com/docs/deploy-node-express-app), [Render free service behavior](https://render.com/docs/free).

## Build and test

From `frontend/`:

```sh
npm run build
npm run preview
```

From `backend/`:

```sh
npm test
npm run build
npm start
```

Each folder has its own lockfile and can be installed, tested, and deployed independently. Root convenience commands are also available: `npm run install:all`, `npm run dev:frontend`, `npm run dev:backend`, `npm run build`, and `npm test`.

## API and implementation

`POST /api/summarize` with `Content-Type: application/json`:

```json
{"url":"https://example.com"}
```

Response:

```json
{
  "title": "Example Domain",
  "url": "https://example.com/",
  "summary": "The AI-generated summary appears here.",
  "wordCount": 25,
  "truncated": false
}
```

The backend fetches basic HTML, prefers article/main content, removes page chrome, and sends up to 16,000 characters to Groq. It rejects private/local addresses, credentials, custom ports, unsafe redirects, oversized responses, and non-HTML files. Outbound sockets are pinned to validated public IPs to prevent DNS rebinding. Limits include a 15-second fetch deadline, 35-second AI timeout, 2 MB decoded page size, five API requests per minute per client, and four concurrent summaries per process. In-memory rate limits reset on process restart and are not distributed.

The UI shows loading, error, and summary states and renders results as text. Scraping does not execute JavaScript or bypass bot protection. Content is sent to Groq; AI can miss details, so check the original source. Tests cover scraping, DNS/address validation, HTML limits, Groq errors, actual HTTP endpoints, CORS/preflight requests, malformed JSON, and throttling without using AI quota.
