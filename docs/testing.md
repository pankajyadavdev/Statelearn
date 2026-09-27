# Testing

## Local checks

Run the type and client build checks from the project root:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

The API suite requires a disposable PostgreSQL database. Set `TEST_DATABASE_URL` to its connection string before running `npm.cmd test`. Each run creates a uniquely named test schema and drops that schema after the tests finish. Do not use a production database for tests. On macOS or Linux, use `npm` instead of `npm.cmd`.

The static SPA fallback check runs when `dist/index.html` exists, so build before the test command to include it.

## Coverage

The Node test suite covers health/readiness, authentication and role enforcement, profile validation and registration, assessment-to-evidence-to-gap-to-recommendation updates, prerequisite ordering, course progress, notifications, assistant citations and abstention, PDF/TXT upload and retrieval, duplicate detection, unsupported legacy PPT, trainer question review, competency/job-role mappings, account analytics, and audit events. It does not replace UI accessibility testing, browser compatibility checks, load tests, formal security testing, model evaluation, or external integration tests.

Docker was not available in this workspace, so container execution has not been verified here.
