# Project inspection

> Historical note: this records the initial workspace inspection. PostgreSQL and the production-oriented account workflows described in the current [README](README.md) were added afterward.

## Findings

- The requested workspace folder was missing at session start. It is now created at the provided path.
- The folder contained no source files, package manifests, database, AI assistant, RAG pipeline, tests, Docker files, or documentation. There is no existing application code to refactor or preserve.
- Node.js 24 and npm 11 are installed. Python and Docker are not available on `PATH`. Node's built-in SQLite API is available.
- React, React DOM, Vite, TypeScript, and Lucide are installed locally for the UI.

## Implementation choices

- Use React + TypeScript + Vite for the client and Node's built-in HTTP and SQLite modules for a runnable local API. The API is kept behind service functions so it can be moved to FastAPI/PostgreSQL when those runtimes and deployment resources are available.
- Use a seeded SQLite database for this self-contained demo. All seeded people, departments, organizations, assessments, courses, and analytics are synthetic. iGOT and NSSTA/TPAC are represented as labelled development catalogue adapters; there are no real government connections.
- AI is provider-abstracted. Without configured credentials, grounded answers and quiz drafts use a deterministic demo provider over seeded learning resources. With configuration, the server can call an Ollama or OpenAI-compatible endpoint.

## Risks and migration requirements

- There was no existing AI College Assistant, so its PDF ingestion, chunking, embeddings, vector index, and quiz logic could not be inspected or reused.
- This environment cannot run FastAPI, PostgreSQL, Docker, or production identity federation. The demo uses SQLite, cookie sessions, and Node API routes instead. Production use requires PostgreSQL migrations, SSO integration, operational secrets, review of applicable government security requirements, and approved iGOT/NSSTA/TPAC documentation and access.
- The demo's local retrieval ranks stored resource passages lexically. It is useful for a small demonstration corpus, but it is not a substitute for a production embedding store and reranker.
