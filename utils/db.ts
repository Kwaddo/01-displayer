import Database from 'better-sqlite3';

const db = new Database('./data/database.db', { verbose: console.log });
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    token TEXT,
    notebookcontent TEXT,
    color_id INTEGER
  );
`).run();
export default db;
