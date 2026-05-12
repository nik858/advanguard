# Advanguard — Landing & Admin

Custom landing page + in-context admin for Nik (Advanguard CEO).

## Stack
- Next.js 16 (App Router) + TypeScript
- Vercel hosting (Hobby tier OK)
- Vercel Blob (media + drafts)
- Vercel KV / Upstash (rate limiting)
- GitHub as CMS backend (commits = content)
- GoHighLevel for CRM

## Local setup

1. `cp .env.example .env.local` and fill values.
2. Generate the admin password hash:
   ```bash
   node -e "require('bcryptjs').hash('your-password', 12).then(console.log)"
   ```
3. **In `.env.local`, escape every `$` in the bcrypt hash as `\$`.** Next.js dotenv loader performs variable expansion otherwise (silent auth failure).
4. `npm install`
5. `npm run dev`
6. Visit http://localhost:3000

## Nik's editing workflow

1. Go to `/admin/login`, log in.
2. Visit `/` — edit mode is now active (blue outlines on hover).
3. Click any text to edit; click [↻ Changer] on media to upload.
4. Click **Publier** in the top bar → commits to GitHub → Vercel rebuilds in 30-60s.

## Architecture

- `app/page.tsx` reads `content/content.json` and renders the landing page.
- Edit mode is activated by the middleware setting `x-adv-edit-mode: 1` when a valid session cookie is present.
- In edit mode, the page loads `EditorProvider`, which manages the draft in localStorage + Vercel Blob (`drafts/nik.json`).
- "Publier" commits `content/content.json` via GitHub API (`@octokit/rest`) → triggers Vercel rebuild.
- Order form leads POST to `/api/lead` → forwarded to GHL Inbound Webhook.
- All admin routes (`/admin/*`) protected by Edge middleware using JWT cookies (HS256, jose).

See `docs/superpowers/specs/2026-05-12-advanguard-landing-admin-design.md` for full design.
See `docs/superpowers/plans/2026-05-12-advanguard-landing-admin.md` for the implementation plan.

## Testing

```bash
npm test
```

## Deployment

1. Push repo to GitHub.
2. `npx vercel link` → connect Vercel project.
3. In Vercel dashboard: Storage → Create Blob store, Create KV store (env vars auto-injected).
4. Add the rest of the env vars via `vercel env add` or the dashboard.
5. `npx vercel --prod` for first production deploy.
