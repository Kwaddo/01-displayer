// app/api/getNotes/route.ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user data by token
    const user = await sql`
      SELECT * FROM users WHERE token = ${token}
    `;

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const notebookContent = user[0].notebookcontent || '';
    return NextResponse.json({ notebookcontent: notebookContent });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}
