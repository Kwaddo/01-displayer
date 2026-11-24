import { NextResponse } from 'next/server';
import { getUserByUserID } from '@/utils/db';

export async function GET(request: Request) {
  try {
    const userID = request.headers.get('Authorization');
    if (!userID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await getUserByUserID(userID);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ colorId: user.color_id || 1 });
  } catch (error) {
    console.error('Error fetching color:', error);
    return NextResponse.json({ error: 'Failed to fetch color' }, { status: 500 });
  }
}
