# StatLearn — Skills and Learning Platform

StatLearn is a working learning platform with learner accounts, PostgreSQL persistence, competency assessments, course recommendations, trainer-managed learning content, and account-based analytics. It starts with no demo accounts or sample courses. Users can register as Learners; the first System Admin is configured with environment variables.

## Requirements

- Node.js 24 or newer and npm
- PostgreSQL 17 or newer, installed locally or through Docker Compose (Docker is optional)

## Set up PostgreSQL and the API

1. Copy the environment template:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Configure `.env` for one PostgreSQL option:

   - **Existing local PostgreSQL:** set `DATABASE_URL` to the host, port, database, username, and password for your PostgreSQL server. `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` are only used by Docker Compose. If you need a local database and role, open a PostgreSQL prompt as an administrator:

     ```powershell
     psql -h 127.0.0.1 -U postgres -d postgres
     ```

     Then create the role and database if they do not already exist:

     ```sql
     CREATE ROLE statlearn LOGIN PASSWORD 'choose-a-strong-alphanumeric-password';
     CREATE DATABASE statlearn OWNER statlearn;
     \q
     ```

     Then set `DATABASE_URL` to use that same role and password. Adjust the host or port if your PostgreSQL server uses different values.

   - **Docker Compose:** replace `POSTGRES_PASSWORD` with a strong alphanumeric password and use that same password in `DATABASE_URL`.

   For either option, set `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` with at least 12 characters. Keep `.env` private and out of Git.

3. If you chose Docker Compose, start its PostgreSQL service. Skip this command if PostgreSQL is already running locally:

   ```powershell
   docker compose up -d db
   ```

4. Install the dependencies and start the development UI and API:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

   Stop any older app process using port `3001` before this command. The UI opens at `http://127.0.0.1:5173`; its PostgreSQL API is at `http://127.0.0.1:3001`. For the complete container setup instead, run `docker compose up --build` and open `http://127.0.0.1:3001`.

5. Create Learner accounts from the app's sign-up form. Sign in as the System Admin using the bootstrap credentials from `.env`. Admins can create Trainer and Department Admin accounts through `POST /api/admin/users`. Trainers can upload learning materials and publish reviewed assessment questions. Admins can create courses through `POST /api/admin/courses`.

## Which files configure the API

| File | Purpose |
| --- | --- |
| [server/index.js](server/index.js) | Opens PostgreSQL, initializes the database, and starts the HTTP server |
| [server/app.js](server/app.js) | API endpoints under `/api`, authentication, validation, permissions, and learning workflows |
| [server/database.js](server/database.js) | PostgreSQL connection pool, schema setup, base competency framework, and optional sample-data seed |
| [.env.example](.env.example) | Database URL, first-admin credentials, organization defaults, and AI provider configuration |
| [docker-compose.yml](docker-compose.yml) | PostgreSQL and app containers with persistent PostgreSQL storage |
| [docs/api.md](docs/api.md) | Endpoint reference and request formats |

The app applies its schema on startup. When running Node outside Docker, `DATABASE_URL` should use `127.0.0.1`; when the app runs in Compose it connects to PostgreSQL through the internal `db` hostname. For a hosted database, use its connection URL and TLS settings. URL-encode reserved characters in connection-string passwords.

## Build, run, and check

```powershell
npm.cmd run dev         # Vite UI and PostgreSQL-backed API
npm.cmd run server      # API server only
npm.cmd run typecheck   # TypeScript check
npm.cmd run build       # Production UI bundle
npm.cmd start           # Serve dist/ and the API on port 3001
```

`npm.cmd start` requires `npm.cmd run build` first. On macOS or Linux, use `npm` rather than `npm.cmd`.

The API test suite uses an isolated PostgreSQL schema. Set `TEST_DATABASE_URL` to a disposable PostgreSQL database before running `npm test`; the suite drops its own schema afterward. Never point it at a production database.

## Accounts and starter content

- A fresh database has no login accounts by default. To sign in, either create a Learner account from the sign-up form or configure the first System Admin credentials in `.env` and restart the API. There is no default live login/password.
- Learner registration is open through the sign-up form. If an email/password pair has not been registered, sign-in correctly returns “Email or password is incorrect.”
- Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` before the first database startup to create the initial System Admin account.
- Trainers and Department Admins are created by a System Admin through `POST /api/admin/users`.
- The competency framework and default organization, department, and job role are initialized automatically.
- Demo users, sample courses, sample notes, and sample questions are optional. Set `SEED_DEMO_DATA=true` only when you specifically want those evaluation records. The seeded demo accounts use `learn1234`; never enable this option in a live environment.

## What works and what needs a provider

Accounts, role permissions, assessment records, competency progress, uploaded learning material, learning-path updates, recommendations, notifications, audit events, and analytics are stored in PostgreSQL. Admins can create users and course mappings through the API; trainers can upload sources and review assessment questions through the app. A learner's course completion is currently self-reported.

The platform does not include external SSO, email delivery, a government course catalogue, LMS enrolment/completion callbacks, or a formal security accreditation. Connect and validate those services before relying on them. The current SQLite file from the earlier local version is not migrated automatically; export any records you need before switching an existing installation.

## Documentation

- [API reference](docs/api.md) · [PostgreSQL setup and schema](docs/database.md) · [Deployment](docs/deployment.md)
- [Architecture](docs/architecture.md) · [Security](docs/security.md) · [AI architecture](docs/ai-architecture.md)
- [Requirement traceability](REQUIREMENT_TRACEABILITY.md) · [Testing](docs/testing.md)
