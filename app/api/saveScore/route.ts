import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
    try {
        const { user_id, siscore } = await request.json();

        const result = await sql`
      UPDATE users
      SET si_score = ${siscore}
      WHERE user_id = ${user_id}
      RETURNING *;  -- Return the updated rows
    `;

        if (result.length === 0) {
            return NextResponse.json({ error: 'Failed to update score' }, { status: 400 });
        }

        return NextResponse.json({
            message: 'Score saved successfully.',
        });
    } catch (error) {
        console.error('Error saving score:', error);
        return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
    }
}
