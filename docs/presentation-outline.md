# Project presentation outline

## Slide 1 — Title and objective

AI-Enabled Skill Intelligence and Learning Platform for Capacity Building of Officials in India's Official Statistical System. Present StatLearn as an account-based platform backed by PostgreSQL.

## Slide 2 — Problem and user journey

Show the competency-to-learning feedback loop and explain how a learner sees role expectations, gaps, evidence, and next steps.

## Slide 3 — System architecture

Use the diagrams in [diagrams.md](diagrams.md). Explain the React/TypeScript UI, Node API, PostgreSQL store, optional AI provider boundary, and local document retrieval.

## Slide 4 — Data model

Show user/role, competency/job-role mapping, evidence/gaps, courses/progress, resources/chunks, assessments, and audit tables. Explain that sample evaluation records can be enabled with `SEED_DEMO_DATA=true` but are off by default.

## Slide 5 — Competency and evidence engine

Explain the 0–5 scale, self/assessment evidence, blend, confidence, role threshold, and gap labels. State that course completion is currently self-reported rather than verified by a connected provider.

## Slide 6 — Explainable recommendation path

Show the weighted signals and the prerequisite-first ordering. Distinguish the deterministic heuristic from a trained recommender.

## Slide 7 — AI assistant and content workflow

Demonstrate upload, extraction, chunking, retrieval, answer citations, unsupported-question abstention, and trainer-reviewed question drafts. Explain the default lexical fallback and optional embedding/LLM endpoint.

## Slide 8 — Security and governance

Cover session and RBAC controls, audit events, upload limits, and production security responsibilities. State clearly that iGOT/NSSTA/TPAC/SSO are not live integrations.

## Slide 9 — Demonstration and verification

Run the learner assessment → gap/recommendation update → course completion loop, then show trainer review and system-admin analytics/framework management. Report typecheck, build, and automated test results.

## Slide 10 — Limits and roadmap

Prioritise vector-store deployment, official identity and learning integrations, richer evidence types, model evaluation, browser accessibility testing, Docker execution, and operational/security reviews.
