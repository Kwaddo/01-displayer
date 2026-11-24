import { NextResponse } from 'next/server';
import { checkStorage } from '@/utils/db';

export async function GET() {
  try {
    await checkStorage();
    return NextResponse.json({ message: 'Storage connected successfully.' });
  } catch (error) {
    console.error('Error reaching storage:', error);
    return NextResponse.json({ error: 'Failed to reach storage.' }, { status: 500 });
  }
}
