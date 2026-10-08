# Pagebrief — AI Web Scraper

A full-stack app that fetches a public webpage, extracts its main HTML text, and returns a short AI summary using **Groq's free API plan**. No paid OpenAI API key is used.

## Submission links

- Public source: https://github.com/duttaanirban/pagebrief
- The deployed URL will be added after hosting succeeds.

## Stack

React 19 and TypeScript for the frontend, Next.js App Router conventions running on Cloudflare's Vinext, an HTTP API route for the backend, Cheerio for HTML extraction, and Groq for summarization. Frontend and backend run in one process and deploy together as a Cloudflare Worker through Sites. No database is needed.

## Run locally (frontend and backend)

Prerequisites: Node.js **22.13 or newer**, npm, and a free Groq account.

```sh
git clone https://github.com/duttaanirban/pagebrief.git
cd pagebrief
npm ci
```

Create **`.env` in the repository root**, beside `package.json`. Copy `.env.example`:

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Get a free key at https://console.groq.com/keys and edit `.env`:

```dotenv
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

Keep your Groq account on its free plan. Models and quotas can change; select a model enabled on your account from https://console.groq.com/docs/rate-limits. `GROQ_MODEL` is optional and defaults to the model above. The key remains on the server. Never put it in a `NEXT_PUBLIC_` variable or commit `.env`.

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. This command starts **both the React frontend and the backend API**. There is no separate backend command or CORS setup. Restart the server after changing `.env`. If PowerShell blocks npm's script shim, use `npm.cmd ci` and `npm.cmd run dev` instead.

Paste a public HTTP/HTTPS URL and select **Summarize**. The button shows **Loading…** while the backend fetches the page and calls Groq. The result includes the page title, source link, summary, and extracted word count. Failures appear inline and preserve the URL so you can retry.

## API

`POST /api/summarize`, with `Content-Type: application/json`:

```json
{"url":"https://example.com"}
```

Successful response:

```json
{
  "title": "Example Domain",
  "url": "https://example.com/",
  "summary": "The AI-generated summary appears here.",
  "wordCount": 25,
  "truncated": false
}
```

Errors return a JSON `error` string and an appropriate HTTP status: 400 for invalid input, 415 for an incorrect request content type, 422 for unsupported/empty pages, 429 for rate limits, 503 for missing/invalid API configuration, and 502/504 for upstream failures/timeouts.

## Checks and production build

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

`npm start` serves the built frontend and backend locally through Wrangler; use the localhost URL printed in the terminal. Tests use mocked external requests, so they need no AI key and consume no quota. Tests cover article extraction, private network URLs and DNS, unsafe redirects, payload limits, non-HTML pages, and AI responses/quota errors.

## Deploy

The app targets **Cloudflare Workers**, not a static-only host. Both UI and API must be deployed. Sites hosting builds the Worker and manages the production environment. Set **`GROQ_API_KEY` as a secret** and optionally `GROQ_MODEL` in the hosting project's runtime environment, then deploy the build. Local `.env` is ignored and is never part of the deployment archive. The `.openai/hosting.json` identifies the existing Sites project.

For direct Cloudflare hosting instead, run `npm run build` and deploy the generated Worker:

```sh
npx wrangler deploy --config dist/server/wrangler.json
npx wrangler secret put GROQ_API_KEY --config dist/server/wrangler.json
```

Wrangler requires a Cloudflare login (`npx wrangler login`) and a unique Worker name in the generated config if its default is already taken. Use your account's Workers free plan. Record the URL printed by deployment. The default model is built into the backend; if you change it, add `GROQ_MODEL` as a Worker runtime variable/secret. Do not deploy just `dist/client`, because it does not contain the backend.

## How it works and limits

1. Validate a URL and resolve its A/AAAA DNS records. Reject credentials, custom ports, local/private IPs, and private DNS answers.
2. Fetch HTML with a 15-second timeout and a 2 MB decoded response limit. Follow up to four redirects, validating every destination.
3. Prefer `article`, then `main`, then the body. Remove scripts, navigation, forms, headers, footers, and other page chrome. Send up to 16,000 characters to AI; the UI marks truncated input.
4. Ask Groq for a short factual plain-text summary with a 35-second timeout. Render text safely through React, without injecting HTML.

Basic server throttling permits five requests per minute per IP and four concurrent requests per Worker instance. These in-memory limits are best-effort and reset on restart; they are not a distributed quota system. Groq also enforces free-plan limits. The scraper does not execute JavaScript, bypass bot protections, access sign-in pages, or extract PDFs. Page content is sent to Groq for processing. AI summaries can miss details.

DNS validation and the outbound fetch are separate operations; Cloudflare Workers network isolation is part of the deployment design. Keep the backend on Workers rather than moving it unchanged to a server with access to a sensitive local network.

## Relevant files

- `app/page.tsx`: URL form, loading/error states, summary rendering.
- `app/globals.css`: responsive styling.
- `app/api/summarize/route.ts`: backend endpoint, key handling and throttling.
- `lib/scraper.ts`: URL/DNS validation, HTML extraction, Groq integration.
- `.env.example`: server environment template.
- `tests/scraper.test.mjs`: automated behavior checks.

The repository also retains Sites starter build scripts and components; unused database examples are not used by this app.
