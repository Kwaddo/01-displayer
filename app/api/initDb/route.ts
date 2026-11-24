import { NextResponse } from 'next/server';
import { getData } from '@/utils/db';

export async function GET() {
  try {
    await getData();
    return NextResponse.json({
      message: 'Database connected successfully and fetched data.',
    });
  } catch (error) {
    console.error('Error querying the database:', error);
    return NextResponse.json({
      error: 'Failed to fetch data from the database.'
    }, { status: 500 });
  }
}
