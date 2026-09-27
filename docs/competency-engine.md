# Competency engine

Competencies are grouped across statistical, technical, digital governance, and behavioural/managerial categories. The demo seeds the requested statistical-office topics and links them to `Statistical Data Analyst` through `job_role_competencies`. System Admin can add competencies, categories, job roles, and role requirements in the analytics workspace. Each requirement has a required level (0–5) and a priority label. A learner has a self-reported level and may also have assessment evidence and current level.

## Evidence update

- Self-assessment saves the selected 0–5 level and records `self_assessment` evidence.
- Assessment submission groups correct answers by competency and maps the score band to an evidence level.
- When assessment evidence exists, current level is rounded from `40% self level + 60% assessment level`; otherwise the submitted self level is used.
- Course completion may raise a mapped competency toward its target and stores demo `course_assessment` evidence. It is explicitly not a verified external credential.
- The gap is `max(0, required level − current level)`. Positive gaps are saved in `skill_gaps`; labels are Low (1), Medium (2), High (3), and Critical (4+).

Dashboard readiness is the average normalized current-to-required level across competencies with role requirements. It is a descriptive demo indicator, not a validated workforce score. Evidence provenance and timestamps are stored so future integrations can distinguish sources.

Relevant code: `competenciesOf`, `saveGaps`, and assessment/course routes in `server/app.js`; schema and synthetic role seeds in `server/database.js`.
