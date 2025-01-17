import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { user_id, color_id } = await request.json();

    const result = await sql`
      UPDATE users
      SET color_id = ${color_id}
      WHERE user_id = ${user_id}
      RETURNING *;  -- Return the updated rows
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Failed to update color' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Color saved successfully.',
    });
  } catch (error) {
    console.error('Error saving color:', error);
    return NextResponse.json({ error: 'Failed to save color' }, { status: 500 });
  }
}
