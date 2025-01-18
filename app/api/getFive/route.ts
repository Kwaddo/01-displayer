import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const result = await sql`
      SELECT user_id, si_score AS "SIscore"
      FROM users
      ORDER BY si_score DESC
      LIMIT 5;
    `;

    return NextResponse.json({ topScores: result });
  } catch (error) {
    console.error('Error fetching top scores:', error);
    return NextResponse.json({ error: 'Failed to fetch top scores' }, { status: 500 });
  }
}
