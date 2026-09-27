import { initDatabase } from './database.js';
import { createAppServer } from './app.js';

const db = await initDatabase();
const server = createAppServer({ db });
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log(`StatLearn API listening on http://${host}:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await db.close(); process.exit(0); }));
