# Talent Connect — Deployment Guide

The project is fully built and ready. Run the steps below from **your own terminal** (not Claude's sandbox).

---

## Option A: Deploy via Vercel CLI (Fastest)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Navigate to the project
```bash
cd /path/to/talent-connect   # wherever your folder is on your computer
```

### 3. Login to Vercel
```bash
vercel login
# Opens browser → choose GitHub / email
```

### 4. Deploy to preview
```bash
vercel
# Answer the prompts:
#   Set up and deploy? Y
#   Which scope? → your account
#   Link to existing project? N
#   Project name? talent-connect
#   Directory? ./
#   Override settings? N
```

### 5. Deploy to production
```bash
vercel --prod
```

---

## Option B: Deploy via GitHub + Vercel Dashboard (Recommended for CI/CD)

### 1. Create a GitHub repo
Go to https://github.com/new and create a new repo (e.g. `talent-connect`)

### 2. Push the code
```bash
cd /path/to/talent-connect
git remote add origin https://github.com/YOUR_USERNAME/talent-connect.git
git push -u origin main
```

### 3. Connect to Vercel
1. Go to https://vercel.com/new
2. Click **"Add New Project"**
3. Import your GitHub repo
4. Vercel auto-detects Next.js — click **Deploy**

Every future `git push` will auto-deploy.

---

## Required Environment Variables

After deploying, set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `AIRTABLE_API_KEY` | `patf3S9W6z...` |
| `AIRTABLE_BASE_ID` | `appBfER6qC...` |
| `AIRTABLE_TABLE_NAME` | `Talent Profiles` |
| `RESEND_API_KEY` | `re_H8Ey9Gc3...` |
| `RESEND_FROM_EMAIL` | `social@britaroma.com` |
| `NEXT_PUBLIC_APP_URL` | `https://talent-connect.vercel.app` ← your deployed URL |

> ⚠️ Set `NEXT_PUBLIC_APP_URL` to your **actual production URL** — this is used in email links.
> After first deploy, Vercel shows you the URL. Update this variable and redeploy.

---

## Function Timeouts (Vercel `vercel.json`)

These are already configured — no action needed. The file in your project root ensures:
- `/api/extract` — 60s (Claude AI can be slow on large CVs)
- `/api/submit` — 60s (file upload + email)
- `/api/update` — 60s (file upload + email)

---

## Post-Deploy Checklist

After deploying to production:

- [ ] Visit `https://your-app.vercel.app` and upload a test CV
- [ ] Check logs in Vercel Dashboard → Functions → Logs
- [ ] Confirm Airtable record was created
- [ ] Confirm confirmation email received (check Resend → Logs)
- [ ] Test the edit link from the email
- [ ] Check `NEXT_PUBLIC_APP_URL` is set to the production URL (not localhost)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Claude extraction times out | Increase timeout in `vercel.json` → `maxDuration: 90` |
| Email links point to localhost | Update `NEXT_PUBLIC_APP_URL` env var in Vercel |
| Airtable errors in logs | Check API key and Base ID in env vars |
| Build fails | Run `npm run build` locally to see errors before deploying |
