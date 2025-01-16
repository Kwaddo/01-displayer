import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

// Initialize database
const db = new Database('./data/database.db', { verbose: console.log });

// Create users table if not already created
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    token TEXT,
    notebookcontent TEXT,
    color_id INTEGER
  )
`).run();

export async function GET() {
  // This will check if the table exists or if it needs to be created
  return NextResponse.json({ message: 'Database and table checked/created successfully.' });
}
