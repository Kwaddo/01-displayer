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
        const existingUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
        
        if (existingUser) {
            const updateStmt = db.prepare(`
                UPDATE users
                SET token = ?
                WHERE user_id = ?
            `);
            updateStmt.run(token, userId);
            return NextResponse.json({ message: 'Token updated successfully' }, { status: 200 });
        } else {
            const insertStmt = db.prepare(`
                INSERT INTO users (user_id, token)
                VALUES (?, ?)
            `);
            insertStmt.run(userId, token);
            return NextResponse.json({ message: 'User data inserted successfully' }, { status: 200 });
        }
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Failed to insert or update user data' }, { status: 500 });
    }
}
