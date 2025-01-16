import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('./data/database.db', { verbose: console.log });

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    token TEXT,
    notebookcontent TEXT,
    color_id INTEGER
  )
`).run();

export async function POST(request: Request) {
    const { userId, token } = await request.json();
    if (!userId || !token) {
        return NextResponse.json({ error: 'userId and token are required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (user_id, token)
      VALUES (?, ?)
    `);
        stmt.run(userId, token);
        return NextResponse.json({ message: 'User data inserted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to insert user data' }, { status: 500 });
    }
}
