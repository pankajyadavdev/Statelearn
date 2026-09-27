# System diagrams

## System context

```mermaid
flowchart TB
  Learner[Learner] --> UI[StatLearn web app]
  Trainer[Trainer] --> UI
  Admin[System admin] --> UI
  UI --> API[Node API]
  API --> DB[(PostgreSQL)]
  API --> Sources[Document parser and local RAG]
  Sources --> DB
  API -. optional configured endpoint .-> AI[LLM / embeddings provider]
  API -. future integration only .-> Gov[External learning systems]
```

## Data flow levels 0 and 1

```mermaid
flowchart LR
  U[User] -->|profile, answers, queries| P0((Skill learning platform))
  P0 -->|dashboard, feedback, sources| U
  T[Trainer] -->|documents and draft content| P0
  P0 -->|review queue and analytics| T
  P0 <--> D[(App database)]
  P0 -. optional model request .-> M[Configured AI service]
```

```mermaid
flowchart TB
  Browser --> Auth[1. Identity and session]
  Auth --> Profile[2. Profile and role context]
  Profile --> Assess[3. Assessment and evidence]
  Assess --> Gap[4. Competency and gap calculation]
  Gap --> Recs[5. Recommendations and path]
  Recs --> Progress[6. Learning progress]
  Progress --> Gap
  Browser --> Assistant[7. Source-grounded assistant]
  Assistant <--> Content[(Resources and chunks)]
  Trainer[Trainer] --> Ingest[8. Ingestion and question review]
  Ingest --> Content
  Ingest --> Assess
```

## User flow

```mermaid
flowchart TD
  Login[Sign in] --> Home[Dashboard]
  Home --> Profile[Review profile and competencies]
  Profile --> Take[Take assessment]
  Take --> Result[Feedback and evidence]
  Result --> Recs[Recalculate learning recommendations]
  Recs --> Course[Enroll and record course completion]
  Course --> Updated[Updated learning evidence]
  Home --> Chat[Ask source-grounded assistant]
```

## Competency loop

```mermaid
flowchart LR
  Role[Role required levels] --> Compare[Compare current level]
  Self[Self-assessment] --> Evidence[Evidence records]
  Quiz[Assessment score] --> Evidence
  Course[Reported completion] --> Evidence
  Evidence --> Current[Current competency level]
  Current --> Compare
  Compare --> Gaps[Persist open gaps]
  Gaps --> Rank[Course recommendations]
  Rank --> Course
```

## Recommendation sequence

```mermaid
flowchart LR
  Gap[Open competency gaps] --> Score[Score relevance, role, goal, history, difficulty, prerequisites]
  Score --> Sort[Sort eligible courses]
  Sort --> Check{Unmet prerequisite?}
  Check -->|Yes| Insert[Insert prerequisite first]
  Check -->|No| Path[Learning path]
  Insert --> Path
```

## Deployment

```mermaid
flowchart LR
  Client[Browser] -->|HTTP / cookie| App[Node server: SPA and API]
  App -->|connection pool| PostgreSQL[(PostgreSQL)]
  App -. optional outbound API .-> Provider[Configured model endpoint]
```

The last diagram shows the local/container setup. It does not depict high availability or production government integrations.
