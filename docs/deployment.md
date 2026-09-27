# Deployment

## Local development

Install Node.js 24 or newer and PostgreSQL 17 or newer. Copy `.env.example` to `.env`, set a strong database password and a System Admin email/password, then start PostgreSQL:

```powershell
Copy-Item .env.example .env
docker compose up -d db
npm.cmd install
npm.cmd run dev
```

The Vite UI is normally at `http://127.0.0.1:5173`; the API is at `http://127.0.0.1:3001`. For a complete container run, use `docker compose up --build`; open `http://127.0.0.1:3001`.

For a PostgreSQL server installed outside Docker, create a database and user, then set `DATABASE_URL` to that server. When the Node app runs on the host, use `127.0.0.1`; containers connect to the Compose database as `db`. URL-encode reserved characters in the connection string password.

## API and database configuration files

- [server/index.js](../server/index.js) loads PostgreSQL, initializes the schema, and starts the HTTP server.
- [server/app.js](../server/app.js) defines `/api` routes, validation, authentication, and role checks.
- [server/database.js](../server/database.js) manages the PostgreSQL pool, schema, starter framework, and optional starter records.
- [.env.example](../.env.example) lists configuration values. Copy it to `.env`; keep `.env` out of source control.
- [docker-compose.yml](../docker-compose.yml) runs PostgreSQL and the app with persistent database storage.

## Production deployment

Use a managed PostgreSQL service or an operated PostgreSQL cluster with TLS, restricted network access, automated backups, and a tested restore process. Supply `DATABASE_URL`, `NODE_ENV=production`, `APP_ORIGIN`, bootstrap credentials, and any AI secrets through the host's secret manager. The production origin must exactly match the browser app origin. Set the cookie's Secure flag by serving HTTPS.

Do not set `SEED_DEMO_DATA=true` in a live environment. The app supports registration, persistent accounts and learning records, course setup, trainer content, assessments, recommendations, and analytics. It does not include external identity federation, email delivery, government course catalogue/LMS adapters, verified completion callbacks, or a formal security accreditation. Course completion is currently recorded as learner self-report.

## Docker setup

The Compose file stores PostgreSQL data in the named `statlearn-postgres` volume. The database port is bound to localhost for development. For production, remove the host port mapping and use private networking. The container image and Compose stack should be run in an environment with Docker Compose installed; Docker was not available in this workspace, so container startup could not be exercised here.
