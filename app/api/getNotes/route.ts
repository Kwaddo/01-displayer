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
    const notebookContent = user.notebookcontent || '';
    return NextResponse.json({ notebookcontent: notebookContent });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}
