import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import pg from 'pg';

const { Pool, types } = pg;
types.setTypeParser(20, value => Number(value));

const identityTables = new Set([
  'roles', 'permissions', 'departments', 'organizations', 'job_roles', 'users',
  'competency_categories', 'competencies', 'courses', 'user_course_progress',
  'learning_resources', 'learning_resource_chunks', 'assessments', 'assessment_questions',
  'assessment_answers', 'quizzes', 'quiz_questions', 'competency_evidence',
  'chat_messages', 'recommendations', 'recommendation_reasons', 'learning_path_items',
  'notifications', 'sessions', 'audit_logs', 'integration_logs',
]);

function postgresSql(sql) {
  const ignoreConflicts = /^\s*INSERT OR IGNORE\s+INTO\s+/i.test(sql);
  const text = sql
    .replace(/^\s*INSERT OR IGNORE\s+INTO\s+/i, 'INSERT INTO ')
    .replace(/\?/g, (() => { let index = 0; return () => `$${++index}`; })());
  return { text, ignoreConflicts };
}

class PgStatement {
  constructor(db, sql) {
    this.db = db;
    const converted = postgresSql(sql);
    this.text = converted.text.trim().replace(/;$/, '');
    this.ignoreConflicts = converted.ignoreConflicts;
  }

  async get(...values) {
    const result = await this.db.query(this.text, values);
    return result.rows[0];
  }

  async all(...values) {
    const result = await this.db.query(this.text, values);
    return result.rows;
  }

  async run(...values) {
    let text = this.text;
    if (this.ignoreConflicts && !/\bON CONFLICT\b/i.test(text)) text += ' ON CONFLICT DO NOTHING';
    const table = text.match(/^INSERT\s+INTO\s+([a-z_]+)/i)?.[1]?.toLowerCase();
    const returnsId = table && identityTables.has(table) && !/\bRETURNING\b/i.test(text);
    if (returnsId) text += ' RETURNING id';
    const result = await this.db.query(text, values);
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  }
}

class PgDatabase {
  constructor(queryable, pool = queryable) {
    this.queryable = queryable;
    this.pool = pool;
  }

  prepare(sql) { return new PgStatement(this, sql); }
  query(sql, values) { return this.queryable.query(sql, values); }
  exec(sql) { return this.queryable.query(sql); }
  close() { return this.pool.end(); }

  async transaction(work) {
    const client = await this.pool.connect();
    const tx = new PgDatabase(client, this.pool);
    try {
      await client.query('BEGIN');
      const result = await work(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const DEMO_PASSWORD = 'learn1234';

const categories = [
  ['Statistical', [
    ['Survey design', 'Plan a fit-for-purpose survey, its frame, questionnaire, and field process.'],
    ['Sampling', 'Select and reason about samples, weights, variance, and estimation.'],
    ['Data quality', 'Apply validation, metadata, disclosure, and quality assurance practices.'],
    ['Official statistics', 'Interpret national accounts, price, labour, and sector statistics.'],
    ['National Accounts', 'Understand concepts, classifications, sources, and compilation of national accounts.'],
    ['Price Statistics', 'Understand price concepts, index construction, and quality adjustment.'],
    ['Labour Statistics', 'Understand labour force concepts, classifications, estimation, and reporting.'],
    ['Agricultural Statistics', 'Understand agricultural frames, surveys, estimation, and seasonal data.'],
    ['Industrial Statistics', 'Understand business and industrial surveys, registers, and indicators.'],
    ['SDG Indicators', 'Compile, validate, and communicate indicators for the Sustainable Development Goals.'],
    ['Metadata Standards', 'Document statistical concepts, methods, provenance, and quality using metadata standards.'],
    ['Data Quality Frameworks', 'Apply statistical quality dimensions, review methods, and improvement practices.'],
  ]],
  ['Technical', [
    ['Python', 'Use Python to clean, analyse, and document statistical data.'],
    ['R', 'Use R for reproducible statistical analysis, visualisation, and reporting.'],
    ['SQL', 'Query, join, validate, and aggregate structured data safely.'],
    ['Stata', 'Use Stata for statistical data management, analysis, and reproducible reporting.'],
    ['SPSS', 'Use SPSS for statistical analysis and documented data workflows.'],
    ['SAS', 'Use SAS for data management and statistical analysis.'],
    ['Data visualization', 'Communicate statistical evidence with clear, accessible charts.'],
    ['AI and machine learning', 'Use AI and machine learning responsibly in statistical work.'],
    ['GIS', 'Use geospatial data and maps in survey planning and analysis.'],
    ['Cloud Computing', 'Use approved cloud services and understand shared-responsibility controls.'],
    ['APIs', 'Use and document APIs to exchange data with appropriate validation and access control.'],
    ['Open Data', 'Prepare data and metadata for responsible, accessible public release.'],
  ]],
  ['Digital governance', [
    ['Data privacy', 'Protect personal data through minimisation, controls, and safe handling.'],
    ['Cybersecurity', 'Recognise common threats and apply secure digital work practices.'],
    ['Digital Signatures', 'Use and validate digital signatures in approved official workflows.'],
    ['Government Cloud', 'Understand approved government cloud environments and controls.'],
    ['Digital Public Infrastructure', 'Understand digital public infrastructure and its responsible statistical use.'],
  ]],
  ['Behavioural and managerial', [
    ['Communication', 'Explain statistical findings to technical and non-technical audiences.'],
    ['Project management', 'Plan, deliver, and monitor statistical projects.'],
    ['Leadership', 'Set direction, support teams, and model responsible statistical practice.'],
    ['Ethics', 'Apply ethical principles to statistical production, analysis, and communication.'],
    ['Decision Making', 'Make and explain evidence-informed decisions under uncertainty.'],
    ['Change Management', 'Plan and support responsible organisational and process change.'],
  ]],
];

const courseSeeds = [
  { title: 'Python for Official Statistics', provider: 'Internal learning library', kind: 'Internal', hours: 12, difficulty: 'Beginner', language: 'English', summary: 'A practical introduction to reproducible data cleaning, analysis, and reporting with Python.', comps: [['Python', 3], ['Data quality', 2]] },
  { title: 'Foundations of Survey Design', provider: 'Internal learning library', kind: 'Internal', hours: 5, difficulty: 'Beginner', language: 'English', summary: 'Define a target population, reference period, survey concepts, and a suitable sampling frame.', comps: [['Survey design', 2], ['Sampling', 1]] },
  { title: 'SQL for Statistical Data', provider: 'iGOT (development mock)', kind: 'iGOT mock', hours: 8, difficulty: 'Beginner', language: 'English', summary: 'Learn to query, join, and validate relational data for official statistics workflows.', comps: [['SQL', 3], ['Data quality', 2]] },
  { title: 'Sampling Methods and Estimation', provider: 'NSSTA / TPAC (development mock)', kind: 'NSSTA mock', hours: 10, difficulty: 'Intermediate', language: 'English', summary: 'Compare probability sampling designs, weights, and estimation choices for surveys.', comps: [['Sampling', 4], ['Survey design', 3]] },
  { title: 'Visualising Public Data', provider: 'Internal learning library', kind: 'Internal', hours: 6, difficulty: 'Beginner', language: 'English', summary: 'Choose charts and communicate uncertainty without distorting statistical evidence.', comps: [['Data visualization', 3], ['Communication', 2]] },
  { title: 'Responsible AI for Statistical Offices', provider: 'iGOT (development mock)', kind: 'iGOT mock', hours: 5, difficulty: 'Intermediate', language: 'English', summary: 'Assess AI use cases, privacy risks, bias, validation, and human oversight.', comps: [['AI and machine learning', 2], ['Data privacy', 2]] },
  { title: 'GIS for Survey Planning', provider: 'NSSTA / TPAC (development mock)', kind: 'NSSTA mock', hours: 9, difficulty: 'Intermediate', language: 'English', summary: 'Use geospatial information to prepare frames, monitor coverage, and explore results.', comps: [['GIS', 2], ['Survey design', 2]] },
  { title: 'Quality Frameworks and Metadata', provider: 'Internal learning library', kind: 'Internal', hours: 7, difficulty: 'Intermediate', language: 'Hindi and English', summary: 'Document metadata, validation checks, revisions, and quality assurance for statistical outputs.', comps: [['Data quality', 4], ['Official statistics', 2]] },
  { title: 'Communicating Statistical Evidence', provider: 'Internal learning library', kind: 'Internal', hours: 4, difficulty: 'Beginner', language: 'Hindi and English', summary: 'Make clear, accessible explanations of statistical methods, uncertainty, and results.', comps: [['Communication', 3], ['Data visualization', 2]] },
];

const resourceSeeds = [
  {
    title: 'Survey Design Field Guide', source: 'Synthetic demo learning note', competency: 'Survey design', language: 'English', page: '2–4',
    content: 'A survey begins with a defined statistical purpose, target population, reference period, and measurable concepts. Choose a sampling frame that covers the target population and document known coverage limitations. Pre-test questions with intended respondents. Record concepts, definitions, collection mode, and quality checks in the metadata. A pilot helps reveal respondent burden, routing errors, and operational issues before a full collection.'
  },
  {
    title: 'Sampling and Estimation Primer', source: 'Synthetic demo learning note', competency: 'Sampling', language: 'English', page: '1–3',
    content: 'A probability sample gives each unit a known, non-zero chance of selection. Stratification can improve precision when strata are internally similar for the survey measure. A design weight begins with the inverse of the inclusion probability and may be adjusted for nonresponse and calibrated to reliable population totals. Report standard errors or other suitable measures of uncertainty with estimates.'
  },
  {
    title: 'Responsible Data and AI Practice', source: 'Synthetic demo learning note', competency: 'Data privacy', language: 'English', page: '5–7',
    content: 'Use the minimum personal data needed for a defined and authorised purpose. Restrict access, protect data in transit and at rest, and document retention and deletion. Assess privacy, bias, and security risks before using an AI system. Validate outputs against appropriate evidence, keep a human accountable for consequential decisions, and do not enter confidential information into an unapproved service.'
  },
  {
    title: 'Reproducible Analysis with Python and SQL', source: 'Synthetic demo learning note', competency: 'Python', language: 'English', page: '1–2',
    content: 'Keep raw inputs unchanged and record the steps used to transform data. Validate data types, missing values, uniqueness, and plausible ranges before analysis. SQL joins should use documented keys and should be checked for unexpected row multiplication. Python analysis should use named steps, explicit parameters, and a saved environment description so that results can be reproduced and reviewed.'
  },
  {
    title: 'Communicating Statistical Results', source: 'Synthetic demo learning note', competency: 'Communication', language: 'Hindi and English', page: '3–4',
    content: 'Start with the decision or question the analysis supports. State the population, period, and important limitations. Use a chart only when its scales and labels make comparisons clear. Explain uncertainty in plain language and distinguish an estimate from a forecast or causal claim. Cite the source and provide accessible text alternatives for visual material.'
  },
];

const questionSeeds = [
  ['Survey design', 'Which step is most useful for finding confusing questionnaire items before a full survey?', ['Increase the sample weight', 'Pilot the questionnaire with intended respondents', 'Remove the metadata', 'Publish preliminary estimates'], 1, 'A pilot with intended respondents can reveal confusing wording, routing problems, and respondent burden.', 'Survey Design Field Guide'],
  ['Survey design', 'What should a well-defined survey purpose specify?', ['Only the software to be used', 'Target population, reference period, and concepts', 'The final chart colours', 'The publication date only'], 1, 'The purpose should establish what population and period are measured and which concepts are needed.', 'Survey Design Field Guide'],
  ['Sampling', 'In a probability sample, each population unit should have:', ['An unknown chance of selection', 'A known, non-zero chance of selection', 'The same survey response', 'A weight of zero'], 1, 'Known, non-zero inclusion probabilities support design-based inference.', 'Sampling and Estimation Primer'],
  ['Sampling', 'A basic design weight is commonly based on:', ['The inverse of the inclusion probability', 'The number of questions', 'The response time', 'The publication frequency'], 0, 'The base design weight is the inverse of a unit’s probability of selection.', 'Sampling and Estimation Primer'],
  ['Data quality', 'Why document metadata and quality checks?', ['To hide limitations', 'To make concepts, methods, and validation traceable', 'To increase file size', 'To replace data validation'], 1, 'Documented metadata and checks help users interpret outputs and reviewers trace quality decisions.', 'Survey Design Field Guide'],
  ['Python', 'What is a useful first check before analysing a new dataset?', ['Change every missing value to zero', 'Validate types, missingness, uniqueness, and plausible ranges', 'Delete the raw input', 'Sort column names alphabetically'], 1, 'Basic profiling catches structural and value problems before analysis.', 'Reproducible Analysis with Python and SQL'],
  ['SQL', 'What should you check after joining two tables?', ['Unexpected row multiplication from non-unique keys', 'Whether all columns are text', 'Whether the server clock changed', 'Whether the chart title is short'], 0, 'A non-unique join key can multiply rows and change totals.', 'Reproducible Analysis with Python and SQL'],
  ['Data privacy', 'Which practice best supports data minimisation?', ['Collect fields in case they might be useful', 'Collect only data needed for an authorised purpose', 'Share identifiers with every team', 'Keep all records forever'], 1, 'Collect only what is needed for an authorised and defined purpose.', 'Responsible Data and AI Practice'],
  ['Data privacy', 'Before using an AI service with confidential records, an official should:', ['Paste the records into any available chatbot', 'Confirm the service is approved and assess privacy and security risks', 'Remove the audit log', 'Assume the service deletes inputs'], 1, 'Confidential data should only be used in approved services after relevant risks and safeguards are checked.', 'Responsible Data and AI Practice'],
  ['Data visualization', 'A chart used to compare estimates should:', ['Use unexplained scales', 'Have clear labels and communicate uncertainty where relevant', 'Omit its source', 'Always start at a non-zero baseline'], 1, 'Clear scales and labels support accurate comparison, and uncertainty is part of statistical interpretation.', 'Communicating Statistical Results'],
];

export function hashPassword(password, salt = randomUUID()) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (!stored?.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

async function seed(db, { seedDemo }) {
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles(name, description) VALUES (?, ?)');
  for (const [name, desc] of [['Learner', 'View own profile, take assessments, and follow learning recommendations.'], ['Trainer', 'Manage learning content, draft questions, and review learner outcomes.'], ['Department Admin', 'View department-level learning analytics.'], ['System Admin', 'Manage the platform and view aggregate analytics.']]) await insertRole.run(name, desc);
  const permissionSeeds = ['profile:read_own','profile:update_own','assessment:take','recommendation:view','content:manage','assessment:review','analytics:department','platform:manage'];
  const insertPermission = db.prepare('INSERT OR IGNORE INTO permissions(name,description) VALUES (?,?)');
  for (const permission of permissionSeeds) await insertPermission.run(permission,permission.replaceAll(':',' ').replaceAll('_',' '));
  const rolePermission = db.prepare('INSERT OR IGNORE INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r,permissions p WHERE r.name=? AND p.name=?');
  for (const permission of ['profile:read_own','profile:update_own','assessment:take','recommendation:view']) await rolePermission.run('Learner',permission);
  for (const permission of ['profile:read_own','profile:update_own','assessment:take','recommendation:view','content:manage','assessment:review']) await rolePermission.run('Trainer',permission);
  await rolePermission.run('Department Admin','analytics:department');
  await rolePermission.run('System Admin','platform:manage');
  for (const permission of ['analytics:department','content:manage','assessment:review']) await rolePermission.run('System Admin',permission);

  const departmentName = process.env.DEFAULT_DEPARTMENT || 'General';
  const organizationName = process.env.DEFAULT_ORGANIZATION || 'My Organization';
  const defaultJobRole = process.env.DEFAULT_JOB_ROLE || 'Statistical Data Analyst';
  await db.prepare('INSERT OR IGNORE INTO departments(name, is_synthetic) VALUES (?, 0)').run(departmentName);
  await db.prepare('INSERT OR IGNORE INTO organizations(name, is_synthetic) VALUES (?, 0)').run(organizationName);
  const departmentId = (await db.prepare('SELECT id FROM departments WHERE name = ?').get(departmentName)).id;
  const organizationId = (await db.prepare('SELECT id FROM organizations WHERE name = ?').get(organizationName)).id;
  await db.prepare('INSERT OR IGNORE INTO job_roles(name, description, is_synthetic) VALUES (?, ?, 0)').run(defaultJobRole, 'Analyse and communicate statistical data.');
  const jobRoleId = (await db.prepare('SELECT id FROM job_roles WHERE name = ?').get(defaultJobRole)).id;

  const compIds = new Map();
  const insertCategory = db.prepare('INSERT OR IGNORE INTO competency_categories(name) VALUES (?)');
  const insertComp = db.prepare('INSERT OR IGNORE INTO competencies(category_id, name, description) VALUES ((SELECT id FROM competency_categories WHERE name = ?), ?, ?)');
  for (const [category, items] of categories) {
    await insertCategory.run(category);
    for (const [name, description] of items) await insertComp.run(category, name, description);
  }
  for (const row of await db.prepare('SELECT id, name FROM competencies').all()) compIds.set(row.name, row.id);

  const required = {
    'Survey design':3,Sampling:4,'Data quality':3,'Official statistics':3,'National Accounts':3,'Price Statistics':3,
    'Labour Statistics':3,'Agricultural Statistics':2,'Industrial Statistics':2,'SDG Indicators':2,
    'Metadata Standards':3,'Data Quality Frameworks':3,Python:3,R:2,SQL:3,Stata:2,SPSS:2,SAS:2,
    'Data visualization':3,'AI and machine learning':2,GIS:2,'Cloud Computing':2,APIs:2,'Open Data':2,
    'Data privacy':3,Cybersecurity:2,'Digital Signatures':1,'Government Cloud':2,'Digital Public Infrastructure':2,
    Leadership:2,Communication:3,'Project management':2,Ethics:2,'Decision Making':2,'Change Management':2,
  };
  const mapRequirement = db.prepare('INSERT OR IGNORE INTO job_role_competencies(job_role_id, competency_id, required_level, priority) VALUES (?, ?, ?, ?)');
  for (const [name, level] of Object.entries(required)) {
    await mapRequirement.run(jobRoleId, compIds.get(name), level, level >= 4 ? 'High' : level >= 3 ? 'Medium' : 'Low');
  }

  if (!seedDemo) return;

  const users = [
    { name: 'Asha Mehta', email: 'learner@demo.gov.in', role: 'Learner', designation: 'Statistical Officer', self: { 'Survey design': 2, Sampling: 1, 'Data quality': 2, 'Official statistics': 2, Python: 1, SQL: 2, 'Data visualization': 2, 'AI and machine learning': 1, GIS: 0, 'Data privacy': 2, Cybersecurity: 1, Communication: 3, 'Project management': 2 } },
    { name: 'Ravi Menon', email: 'trainer@demo.gov.in', role: 'Trainer', designation: 'Training Officer', self: { Python: 3, SQL: 3, Sampling: 3, 'Data quality': 3 } },
    { name: 'Demo Administrator', email: 'admin@demo.gov.in', role: 'System Admin', designation: 'Platform Administrator', self: {} },
    { name: 'Synthetic Learner 01', email: 'official01@example.invalid', role: 'Learner', designation: 'Statistical Officer', self: { Python: 2, SQL: 2, Sampling: 1, 'Data quality': 2 } },
    { name: 'Synthetic Learner 02', email: 'official02@example.invalid', role: 'Learner', designation: 'Research Officer', self: { Python: 3, SQL: 1, Sampling: 2, 'Data visualization': 2 } },
    { name: 'Synthetic Learner 03', email: 'official03@example.invalid', role: 'Learner', designation: 'Statistical Officer', self: { Python: 1, SQL: 3, Sampling: 2, 'Data privacy': 2 } },
    { name: 'Synthetic Learner 04', email: 'official04@example.invalid', role: 'Learner', designation: 'Data Analyst', self: { Python: 2, SQL: 2, 'Data visualization': 3, 'Data quality': 2 } },
    { name: 'Synthetic Learner 05', email: 'official05@example.invalid', role: 'Learner', designation: 'Statistical Officer', self: { Sampling: 3, 'Survey design': 2, 'Official statistics': 3 } },
  ];
  const insertUser = db.prepare('INSERT OR IGNORE INTO users(name,email,password_hash,role_id,department_id,organization_id,job_role_id,designation,experience_years,education,career_goals,languages,is_synthetic) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const linkRole = db.prepare('INSERT OR IGNORE INTO user_roles(user_id,role_id) SELECT u.id,r.id FROM users u,roles r WHERE u.email=? AND r.name=?');
  const insertCompetency = db.prepare('INSERT OR IGNORE INTO user_competencies(user_id,competency_id,self_level,assessment_level,current_level,confidence) VALUES (?,?,?,?,?,?)');
  for (const u of users) {
    await insertUser.run(u.name, u.email, hashPassword(DEMO_PASSWORD, `demo-salt-${u.email}`), (await db.prepare('SELECT id FROM roles WHERE name=?').get(u.role)).id, departmentId, organizationId, jobRoleId, u.designation, u.email.startsWith('learner@') ? 5 : 3, 'Public administration / statistics', 'Build practical skills for high-quality official statistics', 'English,Hindi', 1);
    await linkRole.run(u.email,u.role);
    const id = (await db.prepare('SELECT id FROM users WHERE email=?').get(u.email)).id;
    for (const [name, compId] of compIds) {
      const level = u.self[name] ?? (u.role === 'System Admin' ? 0 : 1);
      await insertCompetency.run(id, compId, level, null, level, 0.62);
    }
  }

  const insertCourse = db.prepare('INSERT OR IGNORE INTO courses(title,description,provider,provider_type,duration_hours,difficulty,language,is_synthetic) VALUES (?,?,?,?,?,?,?,1)');
  const insertCourseComp = db.prepare('INSERT OR IGNORE INTO course_competencies(course_id,competency_id,target_level) VALUES (?,?,?)');
  for (const course of courseSeeds) {
    await insertCourse.run(course.title, course.summary, course.provider, course.kind, course.hours, course.difficulty, course.language);
    const id = (await db.prepare('SELECT id FROM courses WHERE title=?').get(course.title)).id;
    for (const [name, level] of course.comps) await insertCourseComp.run(id, compIds.get(name), level);
  }
  const courseByTitle = new Map((await db.prepare('SELECT id,title FROM courses').all()).map(r => [r.title, r.id]));
  const prerequisite = db.prepare('INSERT OR IGNORE INTO course_prerequisites(course_id, prerequisite_course_id) VALUES (?,?)');
  await prerequisite.run(courseByTitle.get('Sampling Methods and Estimation'), courseByTitle.get('Foundations of Survey Design'));

  const insertResource = db.prepare('INSERT OR IGNORE INTO learning_resources(title,source,competency_id,language,page_reference,content,is_synthetic) VALUES (?,?,?,?,?,?,1)');
  for (const r of resourceSeeds) {
    await insertResource.run(r.title, r.source, compIds.get(r.competency), r.language, r.page, r.content);
    const resourceId=(await db.prepare('SELECT id FROM learning_resources WHERE title=?').get(r.title)).id;
    await db.prepare('INSERT OR IGNORE INTO learning_resource_chunks(resource_id,chunk_index,content,page_reference,metadata_json) VALUES (?,?,?,?,?)').run(resourceId,0,r.content,r.page,JSON.stringify({sourceType:'starter-content',competency:r.competency}));
  }
  const sourceByTitle = new Map((await db.prepare('SELECT id,title FROM learning_resources').all()).map(r => [r.title, r.id]));
  const insertQuestion = db.prepare('INSERT OR IGNORE INTO assessment_questions(competency_id,question,options_json,correct_index,explanation,source_id,status,is_synthetic) VALUES (?,?,?,?,?,?,\'published\',1)');
  for (const [competency, question, options, answer, explanation, sourceTitle] of questionSeeds) await insertQuestion.run(compIds.get(competency), question, JSON.stringify(options), answer, explanation, sourceByTitle.get(sourceTitle));

  const learnerId = (await db.prepare('SELECT id FROM users WHERE email=?').get('learner@demo.gov.in')).id;
  const history = db.prepare('INSERT OR IGNORE INTO user_course_progress(user_id,course_id,status,progress_percent,completed_at) VALUES (?,?,?,?,?)');
  await history.run(learnerId, courseByTitle.get('Visualising Public Data'), 'completed', 100, new Date(Date.now() - 15 * 86400000).toISOString());
  const notice = db.prepare(`INSERT INTO notifications(user_id,title,message,kind)
    SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=? AND title=? AND message=?)`);
  await notice.run(learnerId, 'Your learning profile is ready', 'Complete a short assessment to refine your competency profile and recommendations.', 'learning', learnerId, 'Your learning profile is ready', 'Complete a short assessment to refine your competency profile and recommendations.');
  await notice.run(learnerId, 'A new learning resource is available', 'Explore the Survey Design Field Guide in your AI assistant.', 'resource', learnerId, 'A new learning resource is available', 'Explore the Survey Design Field Guide in your AI assistant.');
  await notice.run(learnerId, 'Assessment reminder', 'Take a short competency check to refresh your learning recommendations.', 'assessment_reminder', learnerId, 'Assessment reminder', 'Take a short competency check to refresh your learning recommendations.');
}

async function createBootstrapAdmin(db) {
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (!email && !password) return;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw new Error('Set both BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD with at least 12 characters.');
  }
  const name = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Platform Administrator').trim().slice(0, 100);
  const roleId = (await db.prepare("SELECT id FROM roles WHERE name='System Admin'").get()).id;
  const departmentId = (await db.prepare('SELECT id FROM departments WHERE name=?').get(process.env.DEFAULT_DEPARTMENT || 'General')).id;
  const organizationId = (await db.prepare('SELECT id FROM organizations WHERE name=?').get(process.env.DEFAULT_ORGANIZATION || 'My Organization')).id;
  const jobRoleId = (await db.prepare('SELECT id FROM job_roles WHERE name=?').get(process.env.DEFAULT_JOB_ROLE || 'Statistical Data Analyst')).id;
  await db.prepare(`INSERT OR IGNORE INTO users(name,email,password_hash,role_id,department_id,organization_id,job_role_id,designation,is_synthetic)
    VALUES (?,?,?,?,?,?,?,'Platform Administrator',0)`).run(name,email,hashPassword(password),roleId,departmentId,organizationId,jobRoleId);
  const user = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
  await db.prepare('INSERT OR IGNORE INTO user_roles(user_id,role_id) VALUES (?,?)').run(user.id,roleId);
  await db.prepare('INSERT OR IGNORE INTO user_competencies(user_id,competency_id,self_level,assessment_level,current_level,confidence) SELECT ?,id,0,NULL,0,0.35 FROM competencies WHERE active=1').run(user.id);
}

export async function initDatabase({ connectionString = process.env.DATABASE_URL, seedDemo = process.env.SEED_DEMO_DATA === 'true', schemaName, resetSchema = false } = {}) {
  if (!connectionString) throw new Error('DATABASE_URL is required. See .env.example for PostgreSQL setup.');
  if (schemaName) {
    if (!/^statlearn_test_[a-f0-9]+$/.test(schemaName)) throw new Error('schemaName is reserved for isolated test schemas.');
    const adminPool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      if (resetSchema) await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await adminPool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    } finally {
      await adminPool.end();
    }
  }
  const pool = new Pool({
    connectionString,
    ...(schemaName ? { options: `-c search_path=${schemaName}` } : {}),
    max: Number(process.env.DATABASE_POOL_SIZE || 10),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  pool.on('error', error => console.error('Unexpected PostgreSQL pool error:', error));
  const db = new PgDatabase(pool);
  const schema = `
    CREATE TABLE IF NOT EXISTS roles(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS permissions(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS role_permissions(role_id INTEGER NOT NULL REFERENCES roles(id),permission_id INTEGER NOT NULL REFERENCES permissions(id),PRIMARY KEY(role_id,permission_id));
    CREATE TABLE IF NOT EXISTS departments(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, is_synthetic INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS organizations(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, is_synthetic INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS job_roles(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL, is_synthetic INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role_id INTEGER NOT NULL REFERENCES roles(id), department_id INTEGER REFERENCES departments(id), organization_id INTEGER REFERENCES organizations(id), job_role_id INTEGER REFERENCES job_roles(id), designation TEXT NOT NULL DEFAULT '', experience_years REAL NOT NULL DEFAULT 0, education TEXT NOT NULL DEFAULT '', career_goals TEXT NOT NULL DEFAULT '', languages TEXT NOT NULL DEFAULT 'English', previous_training TEXT NOT NULL DEFAULT '', certifications TEXT NOT NULL DEFAULT '', current_assignment TEXT NOT NULL DEFAULT '', is_synthetic INTEGER NOT NULL DEFAULT 1, deleted_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS user_roles(user_id INTEGER NOT NULL REFERENCES users(id),role_id INTEGER NOT NULL REFERENCES roles(id),PRIMARY KEY(user_id,role_id));
    CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
    CREATE TABLE IF NOT EXISTS competency_categories(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS competencies(id INTEGER PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES competency_categories(id), name TEXT NOT NULL UNIQUE, description TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS competency_levels(level INTEGER PRIMARY KEY CHECK(level BETWEEN 0 AND 5), label TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS job_role_competencies(job_role_id INTEGER NOT NULL REFERENCES job_roles(id), competency_id INTEGER NOT NULL REFERENCES competencies(id), required_level INTEGER NOT NULL CHECK(required_level BETWEEN 0 AND 5), priority TEXT NOT NULL, PRIMARY KEY(job_role_id,competency_id));
    CREATE TABLE IF NOT EXISTS user_competencies(user_id INTEGER NOT NULL REFERENCES users(id), competency_id INTEGER NOT NULL REFERENCES competencies(id), self_level INTEGER NOT NULL DEFAULT 0 CHECK(self_level BETWEEN 0 AND 5), assessment_level INTEGER CHECK(assessment_level BETWEEN 0 AND 5), current_level INTEGER NOT NULL DEFAULT 0 CHECK(current_level BETWEEN 0 AND 5), confidence REAL NOT NULL DEFAULT 0.4, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,competency_id));
    CREATE TABLE IF NOT EXISTS skill_gaps(user_id INTEGER NOT NULL REFERENCES users(id),competency_id INTEGER NOT NULL REFERENCES competencies(id),current_level INTEGER NOT NULL,required_level INTEGER NOT NULL,gap INTEGER NOT NULL CHECK(gap>0),priority TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,competency_id));
    CREATE TABLE IF NOT EXISTS courses(id INTEGER PRIMARY KEY, title TEXT NOT NULL UNIQUE, description TEXT NOT NULL, provider TEXT NOT NULL, provider_type TEXT NOT NULL, duration_hours REAL NOT NULL, difficulty TEXT NOT NULL, language TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, is_synthetic INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS course_competencies(course_id INTEGER NOT NULL REFERENCES courses(id), competency_id INTEGER NOT NULL REFERENCES competencies(id), target_level INTEGER NOT NULL CHECK(target_level BETWEEN 0 AND 5), PRIMARY KEY(course_id,competency_id));
    CREATE TABLE IF NOT EXISTS course_prerequisites(course_id INTEGER NOT NULL REFERENCES courses(id), prerequisite_course_id INTEGER NOT NULL REFERENCES courses(id), PRIMARY KEY(course_id,prerequisite_course_id), CHECK(course_id <> prerequisite_course_id));
    CREATE TABLE IF NOT EXISTS user_course_progress(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), course_id INTEGER NOT NULL REFERENCES courses(id), status TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled','in_progress','completed')), progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100), enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT, UNIQUE(user_id,course_id));
    CREATE TABLE IF NOT EXISTS learning_resources(id INTEGER PRIMARY KEY, title TEXT NOT NULL UNIQUE, source TEXT NOT NULL, competency_id INTEGER NOT NULL REFERENCES competencies(id), language TEXT NOT NULL, page_reference TEXT NOT NULL, content TEXT NOT NULL, is_synthetic INTEGER NOT NULL DEFAULT 1, file_name TEXT, file_hash TEXT, uploaded_by INTEGER REFERENCES users(id), provider TEXT NOT NULL DEFAULT 'Synthetic demo learning note', topic TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS learning_resource_chunks(id INTEGER PRIMARY KEY,resource_id INTEGER NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,chunk_index INTEGER NOT NULL,content TEXT NOT NULL,page_reference TEXT NOT NULL DEFAULT 'document',metadata_json TEXT NOT NULL DEFAULT '{}',embedding_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(resource_id,chunk_index));
    CREATE INDEX IF NOT EXISTS idx_resource_chunks_resource ON learning_resource_chunks(resource_id,chunk_index);
    CREATE TABLE IF NOT EXISTS assessments(id INTEGER PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL,description TEXT NOT NULL,is_synthetic INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS assessment_questions(id INTEGER PRIMARY KEY, competency_id INTEGER NOT NULL REFERENCES competencies(id), question TEXT NOT NULL, options_json TEXT NOT NULL, correct_index INTEGER NOT NULL, explanation TEXT NOT NULL, source_id INTEGER REFERENCES learning_resources(id), status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','rejected')), is_synthetic INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS assessment_attempts(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), question_ids_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'started' CHECK(status IN ('started','submitted')), score REAL, total_questions INTEGER NOT NULL, submitted_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON assessment_attempts(user_id,created_at);
    CREATE TABLE IF NOT EXISTS assessment_answers(id INTEGER PRIMARY KEY, attempt_id TEXT NOT NULL REFERENCES assessment_attempts(id), question_id INTEGER NOT NULL REFERENCES assessment_questions(id), selected_index INTEGER, is_correct INTEGER NOT NULL, UNIQUE(attempt_id,question_id));
    CREATE TABLE IF NOT EXISTS quizzes(id INTEGER PRIMARY KEY,title TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',is_synthetic INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS quiz_questions(id INTEGER PRIMARY KEY,quiz_id INTEGER NOT NULL REFERENCES quizzes(id),assessment_question_id INTEGER NOT NULL REFERENCES assessment_questions(id),position INTEGER NOT NULL,UNIQUE(quiz_id,position));
    CREATE TABLE IF NOT EXISTS quiz_attempts(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),quiz_id INTEGER NOT NULL REFERENCES quizzes(id),score REAL,total_questions INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS quiz_answers(id INTEGER PRIMARY KEY,attempt_id TEXT NOT NULL REFERENCES quiz_attempts(id),question_id INTEGER NOT NULL REFERENCES assessment_questions(id),selected_index INTEGER,is_correct INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS competency_evidence(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), competency_id INTEGER NOT NULL REFERENCES competencies(id), source TEXT NOT NULL, score REAL NOT NULL, level INTEGER NOT NULL CHECK(level BETWEEN 0 AND 5), confidence REAL NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_evidence_user_comp ON competency_evidence(user_id,competency_id,created_at);
    CREATE TABLE IF NOT EXISTS chat_sessions(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL DEFAULT 'Learning assistant', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS chat_messages(id INTEGER PRIMARY KEY, session_id TEXT NOT NULL REFERENCES chat_sessions(id), role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL, sources_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS recommendations(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), course_id INTEGER NOT NULL REFERENCES courses(id), score REAL NOT NULL, explanation TEXT NOT NULL, generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id,course_id));
    CREATE TABLE IF NOT EXISTS recommendation_reasons(id INTEGER PRIMARY KEY,recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,reason TEXT NOT NULL,weight REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS learning_paths(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),title TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS learning_path_items(id INTEGER PRIMARY KEY,path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id),course_id INTEGER NOT NULL REFERENCES courses(id),stage INTEGER NOT NULL,status TEXT NOT NULL,UNIQUE(path_id,stage));
    CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, message TEXT NOT NULL, kind TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, detail_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS integration_logs(id INTEGER PRIMARY KEY, provider TEXT NOT NULL, action TEXT NOT NULL, outcome TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `;
  try {
    const postgresSchema = schema
      .replace(/\bid INTEGER PRIMARY KEY\b/g, 'id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY')
      .replace(/\bREAL\b/g, 'DOUBLE PRECISION')
      .replace(/\b([a-z_]+_at) TEXT\b/gi, '$1 TIMESTAMPTZ')
      .replaceAll('Synthetic demo learning note', 'Internal learning material');
    await db.exec(postgresSchema);
    await db.exec("ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS file_name TEXT; ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS file_hash TEXT; ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES users(id); ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'Internal learning material'; ALTER TABLE learning_resources ADD COLUMN IF NOT EXISTS topic TEXT");
    await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_resources_hash ON learning_resources(file_hash) WHERE file_hash IS NOT NULL');
  const levels = db.prepare('INSERT OR IGNORE INTO competency_levels(level,label) VALUES (?,?)');
    for (const [i, label] of ['No demonstrated competency','Beginner','Basic','Intermediate','Advanced','Expert'].entries()) await levels.run(i, label);
    await db.transaction(tx => seed(tx, { seedDemo }));
    await createBootstrapAdmin(db);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}
