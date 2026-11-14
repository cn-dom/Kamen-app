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
The Worker validates `Cf-Access-Jwt-Assertion` against Cloudflare Access JWKS. Staging is configured with the Access team domain `mute-frog-153f.cloudflareaccess.com`, application audience, and an email one-time-PIN identity provider. The Access policy currently allows the owner email only. The Worker intentionally fails closed if a valid JWT is missing. Do not replace this with a client-side role or a public API key.

Access protects `kamen-app-api-staging.patriasoul.workers.dev`; its allow policy currently permits `patriasoul@protonmail.com` for initial setup. The API Worker is deployed with the matching team domain, application audience, bootstrap email, and allowed origin `https://kamen-app.patriasoul.workers.dev`. The first authenticated owner creates the company from Settings → Zajednička pohrana. Other user invitations and expansion of the Access allow policy remain a separate onboarding step.

## Storage
D1 holds tenant-scoped JSON business records, memberships, inventory movements and audit entries. The first browser import and conflict-aware localStorage synchronization are implemented in the app. Uploaded drawings are intended for a private R2 bucket. R2 is currently disabled on the Cloudflare account (Cloudflare API returns `Please enable R2 through the Cloudflare Dashboard`), so persistent document upload is intentionally unavailable until the owner enables R2 and a private bucket is created. AI image/PDF extraction processes the selected file in memory and does not persist the original drawing.

## Security
- Every business query is scoped to the company selected by the verified membership.
- Client-provided company IDs are never trusted.
- Workers may read operational records with price/cost fields redacted and may only update production records.
- Only owner/manager may change stock, settings, orders, documents or movements.
- Record updates use optimistic versions; movement submissions use idempotency keys.
