# ForgeDocs production ops runbook

Interview-oriented notes for the Railway + AWS deployment. No secrets belong in this file.

## Stack map

| Piece | Where |
|-------|--------|
| App (`web`) | Railway — https://web-production-ea5e6.up.railway.app |
| Postgres / Redis | Railway plugins (private network) |
| Prometheus | Railway — https://prometheus-production-3ffb.up.railway.app |
| Grafana | Railway — https://grafana-production-4898.up.railway.app (`admin` / `GF_SECURITY_ADMIN_PASSWORD`) |
| Object storage | AWS S3 `forgedocs-673396345120` (`eu-central-1`), account personal |

Local day-to-day: `docker compose` (Postgres, Valkey, MinIO, Prometheus, Grafana `:3001`).

## Deploy

1. Push to `main` on `evgenirovinsky/ForgeDocs` (SSH host alias `github.com-er` if using the personal key).
2. Railway auto-deploys connected services (`web`, `prometheus` root `/ops/prometheus`, `grafana` root `/ops/grafana`).
3. If a push is missed: `railway redeploy --service web --from-source --yes` (same for other services).
4. `web` start runs `prisma migrate deploy` then optional one-shot scripts (`RUN_SEED`, `RUN_PROMOTE_DEFAULT_ADMIN` — keep **false** in steady state).

## Health checks

- App: `GET /api/health` → `{ app, database, valkey }`
- Metrics: `GET /api/metrics` (Prometheus scrape target)
- Prometheus targets UI → `forgedocs-web-private` / `forgedocs-web-public` UP
- Grafana → datasource Prometheus, dashboard **ForgeDocs overview**

## Auth

- **Production:** Azure AD / Entra only (`ALLOW_CREDENTIALS_LOGIN=false`).
- **Local / CI:** credentials + optional `AUTH_E2E_BYPASS`.
- Redirect URI must include Railway callback URL.
- Team invites: accept link **before** first SSO if the user has no membership yet.
- Session role is JWT — after DB role changes (e.g. promote to admin), **sign out and sign in**.

## S3 hardening checklist

Bucket: `forgedocs-673396345120`

- [x] Block Public Access (all four) ON
- [x] Default encryption SSE-S3 (`AES256`)
- [x] Versioning **Enabled**
- [x] Bucket policy **DenyInsecureTransport** (HTTPS only)
- IAM user `forgedocs-s3` inline policy `ForgeDocsS3Access`: `ListBucket` on the bucket; `GetObject` / `PutObject` / `DeleteObject` on `bucket/*` only

App env (Railway `web`): `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`; no `S3_ENDPOINT`; `S3_FORCE_PATH_STYLE=false`.

Policy JSON reference in repo: [`ops/aws/bucket-deny-insecure.json`](../ops/aws/bucket-deny-insecure.json).

## Rotate S3 access keys

1. `aws iam create-access-key --user-name forgedocs-s3` (profile `personal`).
2. Update Railway `web` variables to the new key pair.
3. Redeploy / restart `web`.
4. Smoke: export Word/PDF or upload an image.
5. `aws iam delete-access-key --user-name forgedocs-s3 --access-key-id <OLD>`.

Also rotate if leaked: `AUTH_SECRET`, Entra client secret, Grafana admin password.

## Postgres backups (Railway)

- Prefer Railway’s built-in volume/backup features for the Postgres service when the plan includes them.
- Interview fallback: periodic `pg_dump` to a private S3 prefix once budget allows.
- After restore: run `prisma migrate deploy`; re-check seed vs production data carefully (do **not** set `RUN_SEED=true` on a populated DB unless intentional wipe).

## Incident playbook (short)

| Symptom | Actions |
|---------|---------|
| App unhealthy | Railway logs `web`; check `/api/health`; verify `DATABASE_URL` / `VALKEY_URL` |
| Exports fail | S3 creds/region/bucket; Chromium flags in Docker; S3 signed URL expiry |
| Auth loop | `AUTH_URL` / Entra redirect URI; sign out; cookie domain |
| Metrics empty | Prometheus targets; hit `/api/metrics`; Grafana `PROMETHEUS_URL` |
| Bad deploy | Railway → redeploy previous successful deployment |

## Demo smoke

1. Azure SSO login
2. TipTap save + presence with two sessions (optional)
3. Word/PDF export to S3
4. Team invite (admin) or Share elevate grant
5. Grafana / Prometheus glance
