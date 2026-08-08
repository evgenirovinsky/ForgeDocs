# ForgeDocs

Multi-tenant document workspace built as an interview-prep / portfolio project for a Next.js full-stack role.

**Stack:** Next.js · TypeScript · TipTap · Prisma · PostgreSQL · Valkey · MinIO (S3) · Prometheus · Docker · Vitest · Playwright · GitLab CI · Auth.js (credentials + Azure AD)

## Quick start

```bash
# Infrastructure
docker compose up -d

# App
cp .env.example .env   # already present for local defaults
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Production (Railway)

Live app: https://web-production-ea5e6.up.railway.app

Object storage in production: **AWS S3** bucket `forgedocs-673396345120` (`eu-central-1`). Local docker-compose still uses MinIO.

Add this Azure Entra redirect URI (Web):

```
https://web-production-ea5e6.up.railway.app/api/auth/callback/microsoft-entra-id
```

Open http://localhost:3000 and sign in with a seeded user (password `password123`):

| Email | Tenant | Role |
|-------|--------|------|
| value of `DEFAULT_DEV_EMAIL` | Acme | editor (Azure SSO) |
| bob@acme.test | Acme | viewer |
| dave@acme.test | Acme | owner |
| carol@globex.test | Globex | admin |

Set `DEFAULT_DEV_EMAIL` in `.env` (see `.env.example`) to your Microsoft account email before `npm run db:seed` if you want Azure SSO against the seeded Acme editor.

## Demo script (interview)

1. Login as Acme editor → create/edit a TipTap doc (autosave)
2. Export Word + PDF (artifacts in MinIO, signed URL)
3. Login as Globex admin → Acme docs are absent
4. Login as Acme viewer → edit/create blocked (UI + API 403)
5. Open `/api/metrics` and show Prometheus scraping on `:9090`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:seed` | Seed tenants/users/docs |

## Azure AD

Step-by-step App Registration: [docs/azure-ad-setup.md](docs/azure-ad-setup.md).

Set in `.env`:

- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (`https://login.microsoftonline.com/consumers/v2.0` for personal accounts, or `.../common/v2.0`)

SSO users must already have a `Membership` row (invite/seed). The login page shows **Sign in with Microsoft** when these env vars are set.

## Architecture

See [docs/architecture.md](docs/architecture.md).
