import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const userCountResult = await sql`
      SELECT COUNT(*) AS count
      FROM users;
    `;
    const userCount = userCountResult[0].count;
    if (userCount < 5) {
      return NextResponse.json({ message: 'Not enough played the game!' });
    }
    const result = await sql`
      SELECT user_id, SIscore
      FROM users
      ORDER BY SIscore DESC
      LIMIT 5;
    `;

    return NextResponse.json({ topScores: result });
  } catch (error) {
    console.error('Error fetching top scores:', error);
    return NextResponse.json({ error: 'Failed to fetch top scores' }, { status: 500 });
  }
}
