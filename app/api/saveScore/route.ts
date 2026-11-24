import { NextResponse } from 'next/server';
import { recordScore } from '@/utils/db';

export async function POST(request: Request) {
  try {
    const { user_id, siscore } = await request.json();
    const ok = await recordScore(user_id, Number(siscore) || 0);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to update score' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Score saved successfully.' });
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
