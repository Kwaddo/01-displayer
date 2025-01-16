// app/api/saveNotes/route.ts
import { NextResponse } from 'next/server';
import db from '@/utils/db'; // Assuming you have the db configured correctly

export async function POST(request: Request) {
    const { token, notebookcontent } = await request.json();

    if (!token || !notebookcontent) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    db.prepare('UPDATE users SET notebookcontent = ? WHERE token = ?').run(notebookcontent, token);

    return NextResponse.json({ message: 'Notebook content saved successfully' });
}
