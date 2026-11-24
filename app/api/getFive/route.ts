import { NextResponse } from 'next/server';
import { getTopScores } from '@/utils/db';

export async function GET() {
  try {
    return NextResponse.json({ topScores: await getTopScores(5) });
  } catch (error) {
    console.error('Error fetching top scores:', error);
    return NextResponse.json({ error: 'Failed to fetch top scores' }, { status: 500 });
  }
}
