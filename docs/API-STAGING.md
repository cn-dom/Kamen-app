# Kamen-app API (staging)

This Worker is separate from the currently published static app. It binds only to the empty staging D1 database and is designed to require Cloudflare Access JWT verification before exposing company data.

## Routes
- GET /api/health — non-sensitive health check.
- POST /api/bootstrap — one-time first-company setup, allowed only to BOOTSTRAP_EMAIL and only while companies is empty.
- GET /api/me — verified identity, company and role.
- GET /api/records?type=... — tenant-scoped record retrieval.
- PUT /api/records/:type/:id — tenant-scoped, optimistic-version update and audit entry.
- POST /api/movements — idempotent inventory movement log.
- POST /api/ai/extract-dimensions — vision model extraction from an image; result is only a suggestion and must be reviewed.
- POST /api/documents — private R2 upload (unavailable until R2 is enabled and the binding is configured).

## Required Cloudflare Access setup
The Worker intentionally fails closed until both ACCESS_TEAM_DOMAIN and ACCESS_AUD are configured and a valid `Cf-Access-Jwt-Assertion` is present. Do not replace this with a client-side role or a public API key.

Set the Access application's protected hostname to this staging Worker URL, create an allow policy for the company's users, then configure the exact team domain, application audience and allowed application origin as Worker variables. Set BOOTSTRAP_EMAIL to the intended first owner. The first authenticated owner creates the company; all other users must be invited by an owner/manager through a later membership-management workflow.

## Storage
D1 holds metadata and JSON business records. Uploaded drawings are intended for a private R2 bucket. R2 is currently disabled on the Cloudflare account, so document upload is intentionally unavailable until the bucket is enabled.

## Security
- Every business query is scoped to the company selected by the verified membership.
- Client-provided company IDs are never trusted.
- Workers may read operational records with price/cost fields redacted and may only update production records.
- Only owner/manager may change stock, settings, orders, documents or movements.
- Record updates use optimistic versions; movement submissions use idempotency keys.
