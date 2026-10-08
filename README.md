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
