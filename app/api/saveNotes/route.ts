import { NextResponse } from 'next/server';
import { updateUser } from '@/utils/db';

export async function POST(request: Request) {
  try {
    const { user_id, notebookcontent } = await request.json();
    const ok = await updateUser(user_id, { notebookcontent: String(notebookcontent ?? '') });
    if (!ok) {
      return NextResponse.json({ error: 'Failed to update notes' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Notebook content saved successfully.' });
  } catch (error) {
    console.error('Error saving notes:', error);
    return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
  }
}
