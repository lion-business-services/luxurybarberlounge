# Security Model

- Privileged credentials are server-only.
- RLS protects user-accessible Supabase tables.
- Public registration cannot assign staff roles.
- Square webhooks require signature verification and event idempotency.
- Financial totals are retrieved from canonical provider records, not trusted from the browser.
- Upload buckets enforce file size, MIME type, ownership paths, and signed access for private media.
- Audit records cover role, financial, content, integration, and protected operational changes.
- Public errors are sanitized; logs must redact tokens, secret headers, full sensitive payloads, and private URLs.
- Security headers include CSP, frame denial, referrer policy, content-type protection, and permissions policy.
- Rate limiting, bot protection, and durable job controls should use managed production infrastructure before high-volume launch; the repository includes a preview-safe in-process guard only.
- Account export and deletion are workflows, not unaudited direct cascades.

Before release, run dependency and secret scanning in GitHub/Vercel and review Supabase Security Advisor findings.
