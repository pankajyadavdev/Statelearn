# Requirement traceability

This matrix maps the supplied product goals to the current runnable platform. “Implemented” refers to the application behavior; it does not imply production certification or connection to an official system.

| Requirement area | Status | Implementation / evidence | Scope boundary |
| --- | --- | --- | --- |
| Learner dashboard and profile | Implemented | `src/App.tsx`; `GET /api/dashboard`, `GET/PATCH /api/profile`; `tests/app.test.js` | New learner accounts use the configured default role; no HR system sync |
| Competency framework and gap analysis | Implemented | `server/database.js`, `/api/admin/framework`, `/api/admin/competencies`, admin UI; `docs/competency-engine.md`; framework admin test | Framework is configurable; no imported government standard or bulk import |
| Job-role management, mapping, and learner assignment | Implemented | `/api/admin/job-roles`, `/api/admin/job-roles/:id/competencies`, `/api/admin/users/:id/job-role`, System Admin UI; framework admin test | No HR system sync or bulk mapping import |
| Assessment and competency evidence | Implemented | `/api/assessment/start`, `/api/assessment/:id/submit`, `competency_evidence`; assessment tests | Questions must be authored and published; no psychometric validation or proctoring |
| Personalized recommendations and learning path | Implemented | `/api/recommendations`, `/api/learning/path`, `recommendationList()`; tests check gap response and prerequisite order | Explainable heuristic over the configured local catalogue; no learned ranking model |
| Learning catalogue and progress | Implemented | `/api/catalog`, `/api/admin/courses`, `/api/courses/:id/enroll`, `/complete` | Course completion is self-reported; no provider verification or credit transfer |
| AI assistant and source citations | Implemented with limits | `/api/assistant/chat`; `server/app.js`; `docs/rag.md`; grounded answer tests | Local lexical search by default; optional embeddings are held as JSON in PostgreSQL; deterministic fallback is not a hosted LLM |
| PDF/DOCX/PPTX/TXT/Markdown ingestion | Implemented with limits | `/api/resources/upload`; trainer UI; upload and retrieval tests | 10 MB maximum; no OCR; legacy PPT unsupported; extracted text only; parser risks require production review |
| AI-assisted question drafts and review | Implemented with limits | `/api/trainer/questions/generate`, question creation and review endpoints; trainer tests | Source-grounded draft provider; trainer approval required; generated content is not independently validated |
| Trainer and admin workspaces | Implemented | `/api/trainer/dashboard`, `/api/admin/analytics`, `/api/admin/audit`; role checks and tests | Requires organization structure and course records to be configured; no HR roster sync |
| In-app notifications | Implemented with limits | `/api/notifications`, `/api/notifications/:id/read`; assessment, learning, completion, and trainer-review events; test coverage | No email/push provider, scheduler, or full admin notification workflow |
| Predictive skills analytics | Current-gap summary | `/api/admin/predictions`, analytics UI, prediction test | Deterministic current-gap summary only; not a time-series or workforce forecast |
| Multilingual user experience | Limited | Language metadata and English/Hindi seed labels | UI and assistant responses are not translated; no translation QA or multilingual assessment bank |
| Multiple evidence types | Partial | Self-assessment, quiz evidence, and demo course-completion evidence | No trainer-scored practical exercise, certification verification, or learning-performance model |
| Detailed trainer performance and assessment authoring | Partial | Content upload, question drafting/review, learner and attempt totals | No trainer assessment campaign builder, cohort improvement analysis, or learner roster management |
| Analytics filters and role/dept breakdowns | Partial | Aggregate seeded-department and course queries in `/api/admin/analytics` | No filter parameters for periods, role, course, competency; no validated performance analytics |
| Requested normalized assessment/provider entities | Partial | Core normalized user, role, competency, course, attempt, evidence, path, chat, notification, and audit tables | Some option/provider/enrollment detail is represented by JSON or course columns; quiz tables are reserved but not used as a separate workflow |
| Load/performance testing | Not run | No load-testing harness or production-scale corpus | Small local synthetic dataset only; no scale or latency claim |
| RBAC, account registration, and session | Implemented | `roles`, `permissions`, session cookies, password hashing, route role checks, admin user creation | No SSO, MFA, identity proofing, HR sync, or production account lifecycle |
| Audit history | Implemented | `audit_logs`; admin audit endpoint; audit test | Local database audit only; no immutable or central log service |
| iGOT / NSSTA / TPAC learning integration | Mock-labelled only | Course records show development-mock provider names | No API credentials, external API calls, enrolment, or completion sync |
| PostgreSQL persistence and deployment configuration | Implemented with limits | `pg` connection pool, `DATABASE_URL`, PostgreSQL schema initialization, Compose service | No pgvector, Chroma, or managed database resources are provisioned by the app |
| FastAPI service | Not implemented | Node HTTP API selected for the available runtime | Replace/migrate the API if FastAPI is a hard deployment requirement |
| Docker deployment | Configuration provided, unverified here | `Dockerfile`, `docker-compose.yml` | Docker was unavailable in the build environment; container execution has not been verified |
| Government production readiness | Not implemented | See `docs/security.md` and `docs/deployment.md` | Requires architecture, policy, security, privacy, accessibility, scale, and integration reviews |

## Verification mapping

The Node test suite covers health/readiness and session enforcement; assessment-to-gap-to-recommendation flow; prerequisite order and course completion; grounded citations and no-source behavior; trainer uploads, duplicate detection, format rejection, question generation and review; admin competency/role mapping; role checks; analytics and audit; profile validation; registration; and (after a production build) SPA route serving. Run the typecheck, build, and test commands described in [testing.md](docs/testing.md).
