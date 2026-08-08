# ForgeDocs architecture

## Overview

ForgeDocs is a multi-tenant document workspace. Every authenticated user has a primary tenant membership with a role (`owner` | `admin` | `editor` | `viewer`). Document data is always scoped by `tenantId`.

```
Browser → Next.js (App Router)
            ├─ Auth.js session (JWT) with tenant + role claims
            ├─ Prisma → PostgreSQL
            ├─ Valkey → export job status cache
            ├─ MinIO/S3 → images + Word/PDF artifacts
            └─ /api/metrics → Prometheus → Grafana
```

## Tenant isolation

`createTenantPrisma({ tenantId })` wraps Prisma with a client extension that:

- Injects `tenantId` into Document `findMany` / `findFirst` / `create` / `*Many`
- Returns `null` from `findUnique` when the row belongs to another tenant
- **Fails closed** on `update` / `delete` if `where.tenantId` is not the active tenant

API routes obtain the session via `requireSession()` and never accept a client-supplied tenant id.

## RBAC

| Action | Minimum role |
|--------|----------------|
| Read / list / export | viewer (any tenant member) |
| Create | editor |
| Update / delete / upload | editor **or** per-document `DocumentGrant` with `editor` |
| Manage document grants | document creator, or tenant admin/owner |
| Invite members to tenant | admin/owner (`TenantInvite`) |

Enforced in `src/server/rbac.ts`, `src/server/document-access.ts`, `src/server/invites.ts`, and API helpers (`forbidUnlessWriter` / `forbidUnlessDocWriter` / `forbidUnlessTenantAdmin`).

**Per-document ACL (elevate-only):** tenant members still see all docs. A `viewer` may receive an explicit `DocumentGrant` that elevates them to editor on one document. Grants cannot reduce access below the tenant role. Share targets must already be members of the same tenant.

**Tenant invites (demo delivery):** admin/owner creates an invite on `/team`. The API returns an accept link (also logged via `src/server/mail.ts` — no SMTP/Resend yet). Opening `/invites/accept?token=…` provisions `User` + `Membership`, then the invitee signs in (Azure with matching email, or credentials with `password123`). Accept the invite **before** first SSO. Multi-tenant users keep the oldest membership as primary until a tenant switcher exists.

## Editor & export

1. TipTap stores JSON in `Document.content`
2. Autosave PATCHes `/api/documents/:id`
3. Export creates an `ExportJob`, processes immediately (demo-friendly), uploads to MinIO
4. Clients poll `/api/exports/:id` for a signed download URL
5. Valkey mirrors job status for fast reads

Word: TipTap JSON → `docx`  
PDF: TipTap JSON → HTML → Puppeteer

## Auth

- **Dev / CI:** Credentials provider (seeded password or `AUTH_E2E_BYPASS`)
- **Production-ready path:** Microsoft Entra ID via Auth.js; maps `oid` → `User.azureOid`; membership still required

Middleware uses Edge-safe `auth.config.ts` (no Prisma). Full providers live in `src/auth.ts` (Node).

## Presence (realtime baseline)

- Per-document presence in Valkey (`presence:doc:{id}` hash + pub/sub channel)
- `POST /api/documents/:id/presence` heartbeat/cursor; `GET` same path as SSE for fan-out
- TipTap remote carets/selections via decoration plugin; avatars in the editor chrome
- Document content still last-write-wins via PATCH autosave (no Yjs/CRDT yet)

## Observability

- `prom-client` default metrics + HTTP duration histogram (`forgedocs_http_request_duration_seconds`) + export counters (`forgedocs_export_jobs_total`)
- Scraped by Prometheus (local: `prometheus.yml` → `host.docker.internal:3000/api/metrics`; Railway: private + public scrape jobs)
- Grafana provisioned dashboards (`ops/grafana`) → Prometheus; Railway service + local Compose on `:3001`

## Local services (`docker compose`)

| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| Valkey | 6379 |
| MinIO API / Console | 9000 / 9001 |
| Prometheus | 9090 |
| Grafana | 3001 |
