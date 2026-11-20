# Brilliant Trading Academy

A minimal web app for **Brilliant Trading Academy** — forex trading education, signal services, and products like expert advisors (EAs) and indicators — with a built-in "Ask a Mentor" AI chat powered by the Mistral API.

Built with:

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Official Mistral SDK: [`@mistralai/mistralai`](https://github.com/mistralai/client-ts)
- Model: `mistral-small-latest`

## Features

- Landing page describing the academy: courses, signals, and products (EAs and indicators)
- Chat interface at `/chat` that calls Mistral through a server-side API route
- The `MISTRAL_API_KEY` is **only ever read on the server** (`app/api/chat/route.ts`) — the browser never sees it

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Mistral API key

Copy `.env.example` to `.env.local` and paste your key from
[console.mistral.ai/api-keys](https://console.mistral.ai/api-keys):

```bash
cp .env.example .env.local
```

```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

`.env.local` is git-ignored, so the key never gets committed.

### 3. Run the app locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Home page: academy overview
- `/chat`: the AI mentor chat
- Chat API: `POST /api/chat` with `{ "messages": [{ "role": "user", "content": "..." }] }`

### Production build

```bash
npm run build
npm start
```

## Project Structure

```
app/
  page.tsx          # Landing page (courses, signals, products)
  chat/page.tsx     # Chat interface
  api/chat/route.ts # Server route that calls the Mistral API
  layout.tsx        # Header, footer, global metadata
  globals.css       # Styling
```

## Disclaimer

Trading foreign exchange carries a high level of risk. This software does not
constitute financial advice.
