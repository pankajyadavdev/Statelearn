# Retrieval-augmented generation flow

## Ingestion

The trainer uploads PDF, DOCX, PPTX, TXT, or Markdown. The server checks file size and extension, parses in memory, normalizes extracted text, rejects empty/unreadable content, de-duplicates by SHA-256, and builds overlapping chunks. Resource metadata and chunks are stored in PostgreSQL. If an embedding endpoint is configured, chunk vectors are stored as JSON alongside the text. The original upload is not persisted.

```mermaid
flowchart LR
  File[Trainer upload] --> Validate[Size, extension, duplicate checks]
  Validate --> Extract[Text extraction in memory]
  Extract --> Split[Normalize and chunk]
  Split --> Embed{Embedding configured?}
  Embed -->|Yes| Vector[Call embedding endpoint]
  Embed -->|No| Lexical[Lexical retrieval only]
  Vector --> Save[(PostgreSQL resources, chunks, optional vectors)]
  Lexical --> Save
```

## Question and answer

```mermaid
sequenceDiagram
  participant U as Learner or trainer
  participant A as API
  participant R as Retriever
  participant D as PostgreSQL
  participant M as Optional model
  U->>A: Ask question / request draft
  A->>R: Normalize and retrieve candidate passages
  R->>D: Read matching chunks and metadata
  D-->>R: Passage text, topic, source, page
  R-->>A: Ranked passages or no result
  opt Chat provider configured
    A->>M: Prompt with question and retrieved context
    M-->>A: Grounded response
  end
  A-->>U: Answer, citations, provider label
```

By default the vector path is absent and search is lexical. Optional vectors do not imply a vector database: they reside as JSON in PostgreSQL and are scanned in process. There is no OCR, reranker, hybrid index, source-authority registry, or citation entailment check. Scanned image-only PDFs fail with a clear message and must be OCR-processed before upload. `.ppt` is unsupported; convert to `.pptx`.
