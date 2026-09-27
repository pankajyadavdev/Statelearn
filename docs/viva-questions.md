# Viva questions and concise answers

1. **What problem does StatLearn address?**  It demonstrates a competency-led learning loop: compare evidence with role requirements, identify gaps, recommend learning, assess again, and refresh the profile.
2. **How is a competency gap calculated?**  `max(0, required level − current level)`, with positive gaps labelled Low, Medium, High, or Critical.
3. **How is learner readiness computed?**  The app averages each mapped competency's current level divided by its required level, capped at 100%. It is a descriptive measure, not a validated workforce metric.
4. **How does the assessment update a competency?**  Correct-answer percentage maps to a 0–5 assessment level. The stored current level blends 40% self-reported and 60% assessment evidence; evidence source, score, level, confidence, and timestamp are stored.
5. **How are course recommendations ranked?**  A transparent weighted heuristic considers gap size, role requirement, goal-topic text match, history, difficulty, prerequisite status, and priority. The path inserts unmet prerequisites first.
6. **How does the assistant use sources?**  It ranks text chunks lexically by default, returns source/page metadata, and abstains if no chunk meets the relevance threshold. Optional configured embeddings are stored as JSON in PostgreSQL.
7. **Does the project use a vector database?**  No. PostgreSQL stores application records and optional embeddings as JSON; retrieval runs in the API process. pgvector, Chroma, and Qdrant are not implemented.
8. **How are generated questions kept safe?**  Drafts are created from a learning source and remain unpublished until a trainer reviews and approves them. Provider output is schema-checked, with a deterministic fallback.
9. **How is access controlled?**  API routes authenticate an opaque session cookie, apply role checks, validate writes and origins, hash passwords with scrypt, and log key events. This does not provide SSO or MFA.
10. **How does the backend connect to PostgreSQL?**  `server/database.js` uses the `pg` connection pool configured by `DATABASE_URL`. `server/index.js` initializes the schema before it starts accepting requests.
11. **Are iGOT and NSSTA connected?**  No. The catalogue labels are development mocks; no external API was invented or called.
12. **What work remains before production use?**  Official identity and content integrations, secure document processing, approved data/policy review, operational deployment, privacy/security/accessibility reviews, and tested backups and monitoring.

## Optional evaluation credentials

Set `SEED_DEMO_DATA=true` to create the optional sample records documented in [demo.md](demo.md). The sample accounts use `learn1234`; leave demo seeding disabled in live environments.
