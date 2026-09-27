# API reference

The API is served under `/api`. JSON endpoints use `application/json`; document uploads send raw bytes with headers. Authenticated routes require the `statlearn_session` cookie. Errors use `{ "error": "..." }`. Role checks run in the API, independently of UI navigation.

| Method and path | Authentication / role | Request | Response |
| --- | --- | --- | --- |
| `GET /health` | Public | None | `{ status, app }` |
| `GET /ready` | Public | None | `{ status, database: "postgresql" }`; 503 if the database is unavailable |
| `POST /auth/login` | Public | JSON `{ email, password }` | `{ user }`; sets the session cookie |
| `POST /auth/register` | Public | JSON `{ name, email, password }` | 201 `{ user }`; creates a Learner and session |
| `POST /auth/logout` | Session cookie optional | None | `{ ok: true }`; expires the cookie |
| `GET /auth/me` | Session | None | `{ user }` |
| `GET /dashboard` | Session | None | Profile, readiness, competency gaps, recommendations, and recent activity |
| `GET /profile` | Session | None | Profile object |
| `PATCH /profile` | Session | JSON profile fields | Updated profile object |
| `GET /competencies` | Session | None | `{ items, levels }` |
| `PATCH /competencies/:id` | Session | JSON `{ selfLevel: 0..5 }` | Updated competency object |
| `GET /catalog` | Session | None | `{ items: Course[] }` |
| `GET /recommendations` | Session | None | `{ items: Course[] }` with score and explanation |
| `GET /learning/path` | Session | None | `{ title, items, updatedAt }` |
| `POST /courses/:id/enroll` | Session | Empty JSON | `{ ok, courseId }` |
| `POST /courses/:id/complete` | Session | Empty JSON | `{ ok, courseId, competencies }`; completion is self-reported |
| `POST /assessment/start` | Session | Empty JSON | 201 `{ attemptId, questions, total }` |
| `POST /assessment/:attemptId/submit` | Session; attempt owner | JSON `{ answers: { [questionId]: selectedIndex } }` | Score, feedback, updated competencies, recommendations, and gaps |
| `GET /assessment/history` | Session | None | `{ items: Attempt[] }` |
| `GET /resources` | Session | None | `{ items: Resource[] }` |
| `POST /resources/upload` | Trainer / System Admin | Raw bytes; headers `X-Document-Name`, `X-Competency-Id`, `X-Language`; maximum 10 MB | 201 with resource metadata and chunk count |
| `POST /assistant/chat` | Session | JSON `{ message, sessionId? }` | `{ sessionId, answer, sources, provider, grounded }` |
| `GET /notifications` | Session | None | `{ items: Notification[] }`, unread first |
| `PATCH /notifications/:id/read` | Session; owner | Empty JSON | `{ ok, id }` |
| `GET /trainer/dashboard` | Trainer / System Admin | None | Question review, learner, and assessment counts |
| `POST /trainer/questions` | Trainer / System Admin | JSON `{ competencyId, question, options, correctIndex, explanation }` | 201 `{ id, status: "draft" }` |
| `POST /trainer/questions/generate` | Trainer / System Admin | JSON `{ competencyId }` | 201 draft question and source details |
| `PATCH /trainer/questions/:id/review` | Trainer / System Admin | JSON `{ status: "published" | "rejected" }` | `{ id, status }` |
| `GET /admin/analytics` | Department Admin / System Admin | None | Current account, learning, assessment, competency-gap, and course metrics |
| `GET /admin/predictions` | Department Admin / System Admin | None | Current gap summary; the score is not a forecast |
| `GET /admin/audit` | System Admin | None | `{ items: AuditEvent[] }` |
| `GET /admin/framework` | System Admin | None | `{ categories, competencies, roles, learners, mappings, levels }` |
| `GET /admin/users` | System Admin | None | `{ items: User[] }` |
| `POST /admin/users` | System Admin | JSON `{ name, email, password, role, departmentId?, organizationId?, jobRoleId? }` | 201 account summary; role may be Learner, Trainer, or Department Admin |
| `POST /admin/courses` | System Admin | JSON course details plus `competencies: [{ competencyId, targetLevel }]` and optional prerequisite IDs | 201 created course |
| `POST /admin/competencies` | System Admin | JSON `{ name, category, description }` | 201 created competency |
| `POST /admin/job-roles` | System Admin | JSON `{ name, description }` | 201 created job role |
| `POST /admin/job-roles/:id/competencies` | System Admin | JSON `{ competencyId, requiredLevel: 0..5, priority }` | Updated role-to-competency mapping |
| `PATCH /admin/users/:id/job-role` | System Admin; Learner account | JSON `{ jobRoleId }` | `{ userId, jobRoleId, jobRole }`; recalculates gaps |

## Registering an account

The app's sign-up form calls `POST /api/auth/register` and creates a learner account. To create Trainer or Department Admin accounts, first sign in as the System Admin configured by `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`, then call `POST /api/admin/users`.

Example request body:

```json
{
  "name": "Learning Coordinator",
  "email": "trainer@example.org",
  "password": "use-a-long-unique-password",
  "role": "Trainer"
}
```

The System Admin can add a course using `POST /api/admin/courses`. Read `/api/admin/framework` first to get competency IDs. Trainers can upload source documents, write questions, and publish reviewed questions. An assessment can start after at least four questions have been published.

Requests that create or update records must include an `Origin` that matches `APP_ORIGIN` or the app's local origin. Login and sign-up set an HttpOnly session cookie; send that cookie with later authenticated calls. Errors include 400 invalid input, 401 missing session, 403 role/origin denied, 404 unknown route or record, 409 duplicate/conflicting record, 413 oversized upload, 415 unsupported file, 422 unreadable document, and 429 rate limited.

There is no generated OpenAPI document. Route handlers, validation, and role checks are in [server/app.js](../server/app.js).
