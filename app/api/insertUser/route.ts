import { NextResponse } from 'next/server';
import { createUserIfMissing } from '@/utils/db';

export async function POST(request: Request) {
  try {
    // The session token is intentionally not stored.
    const { userId } = await request.json();
    const created = await createUserIfMissing(userId);
    return NextResponse.json({
      message: created ? 'User data inserted successfully.' : 'User already exists.',
    });
  } catch (error) {
    console.error('Error inserting user data:', error);
    return NextResponse.json({ error: 'Failed to insert user data.' }, { status: 500 });
  }
}
