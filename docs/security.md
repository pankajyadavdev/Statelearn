# Security notes

## Application controls

- Passwords are derived with Node `scrypt`; session tokens are random and only their SHA-256 hashes are stored.
- The session cookie is `HttpOnly`, `SameSite=Lax`, path-wide, and marked `Secure` when `NODE_ENV=production`.
- Mutations check an allowed origin list. Request bodies and document uploads have size limits.
- A login failure limiter allows 10 unsuccessful attempts per IP in a 15-minute window. Other write routes have in-memory per-IP limits.
- API responses include content-security, frame, MIME-sniffing, referrer, permissions-policy, and cross-origin resource headers.
- Role checks run in the API. Audit events capture key account, learning, content, and review actions.
- Notification reads are scoped to the signed-in account. User records are persistent in PostgreSQL.
- Original uploaded files are parsed in memory and not saved. The database contains extracted text and metadata.

## Deployment responsibilities

These controls are application safeguards, not a security accreditation. Before handling regulated or sensitive data, configure TLS, database network restrictions, managed secrets, least-privilege database roles, automated backups, restore drills, log monitoring, retention/deletion rules, and operational incident response. Review privacy, accessibility, authentication, threat modeling, and penetration testing requirements for the deployment.

Rate limits are process-local and reset on restart; sessions have a fixed lifetime and no MFA or federated identity. Document parsers process untrusted files, so production ingestion should run with resource limits, malware scanning, monitoring, and an approved retention policy. Do not set `SEED_DEMO_DATA=true` in live environments.
