# Talent Connect

A global part-time consulting talent network — powered by Claude AI.

Upload a resume → AI extracts skills and profile → consultant matches candidates to projects across UK, Europe, USA, and Middle East.

## Stack

- **Next.js 14** (App Router) — frontend + serverless API
- **Claude Haiku 4.5** (Sonnet 4.5 fallback) — resume extraction
- **Airtable** — profile database + file storage
- **Resend** — confirmation emails with edit links
- **@dnd-kit** — drag-and-drop skills interface
- **Vercel** — hosting (free tier)

---

## Setup (one time)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Airtable base
Make sure your Airtable personal access token has these scopes:
- `schema.bases:write` · `schema.bases:read`
- `data.records:write` · `data.records:read`

Then run:
```bash
AIRTABLE_API_KEY=pat... node scripts/setup-airtable.js
```

Copy the printed `BASE_ID` into `.env.local`.

### 3. Configure `.env.local`
```
ANTHROPIC_API_KEY=sk-ant-...
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...          ← from step 2
AIRTABLE_TABLE_NAME=Talent Profiles
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com   ← must be verified in Resend
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add all env vars from `.env.local` in Vercel's dashboard (Settings → Environment Variables)
4. Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Deploy!

---

## Edit flow

When someone submits, they receive a confirmation email with a unique edit link:
```
https://your-app.vercel.app/edit/<uuid-token>
```
The token is stored in Airtable. Clicking the link pre-fills their form for easy updates. Submitting the same email twice redirects to the edit page rather than creating a duplicate.

---

## Resend domain setup

For production emails, verify your domain in Resend (dashboard → Domains) and update `RESEND_FROM_EMAIL` to use your verified domain. Until then, you can use Resend's shared domain for testing.
