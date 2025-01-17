import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { user_id, notebookcontent } = await request.json();

    const result = await sql`
      UPDATE users
      SET notebookcontent = ${notebookcontent}
      WHERE user_id = ${user_id}
      RETURNING *;  -- Return the updated rows
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Failed to update notebook content' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Notebook content saved successfully.',
    });
  } catch (error) {
    console.error('Error saving notes:', error);
    return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
  }
}
