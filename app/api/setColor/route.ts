import { NextResponse } from 'next/server';
import { updateUser } from '@/utils/db';

export async function POST(request: Request) {
  try {
    const { user_id, color_id } = await request.json();
    const ok = await updateUser(user_id, { color_id: Number(color_id) || 1 });
    if (!ok) {
      return NextResponse.json({ error: 'Failed to update color' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Color saved successfully.' });
  } catch (error) {
    console.error('Error saving color:', error);
    return NextResponse.json({ error: 'Failed to save color' }, { status: 500 });
  }
}
