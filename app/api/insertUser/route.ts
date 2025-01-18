// app/api/insertUser/route.ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const { userId, token } = await request.json();
    const existingUser = await sql`
      SELECT * FROM users WHERE user_id = ${userId}
    `;
    
    if (existingUser.length > 0) {
      return NextResponse.json({
        message: 'User already exists.',
      });
    }

    await sql`
      INSERT INTO users (user_id, token)
      VALUES (${userId}, ${token})
    `;

    return NextResponse.json({
      message: 'User data inserted successfully.',
    });
  } catch (error) {
    console.error('Error inserting user data:', error);
    return NextResponse.json({
      error: 'Failed to insert user data.',
    }, { status: 500 });
  }
}
