# Azure AD (Entra ID) setup for ForgeDocs

Local app already supports Microsoft sign-in via Auth.js when these env vars are set. Credentials login remains available for seeded users and CI.

## 1. Create an App registration

1. Open [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: `ForgeDocs` (local)
3. **Supported account types** (personal Microsoft account):  
   **Accounts in any organizational directory and personal Microsoft accounts**  
   or **Personal Microsoft accounts only**
4. **Redirect URI** — platform **Web**:
   ```
   http://localhost:3000/api/auth/callback/microsoft-entra-id
   ```
5. Register

## 2. Create a client secret

1. App → **Certificates & secrets** → **New client secret**
2. Copy the **Value** once (this is `AUTH_MICROSOFT_ENTRA_ID_SECRET`)

## 3. Copy IDs into `.env`

From **Overview**:

| Field | Env var |
|-------|---------|
| Application (client) ID | `AUTH_MICROSOFT_ENTRA_ID_ID` |
| Directory (tenant) ID | used in issuer (see below) |
| Client secret Value | `AUTH_MICROSOFT_ENTRA_ID_SECRET` |

**Issuer** — match the account type you selected:

```env
# Org tenants + personal Microsoft accounts (recommended for ForgeDocs):
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/common/v2.0

# Personal Microsoft accounts only:
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/consumers/v2.0
```

Also ensure:

```env
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
```

Restart `npm run dev` after editing `.env`. The login page shows **Sign in with Microsoft** when client ID + secret are set.

## 4. First login / tenant membership

ForgeDocs requires a `Membership` row. After Azure login, if your email is not already a member, sign-in is denied.

For local testing, either:

- Set `DEFAULT_DEV_EMAIL` in `.env` to your Microsoft email, then run `npm run db:seed`, or
- After creating the Entra user row, attach a membership manually / via seed

Verify with:

```bash
npm run db:seed
npx tsx scripts/verify-sso-user.ts
```

## 5. Token API permissions (usually default)

App → **API permissions** — `Microsoft Graph` → `openid`, `profile`, `email`, `User.Read` (delegated) are enough for sign-in. Grant admin consent only if your tenant requires it (personal MSA usually does not).
