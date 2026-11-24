import { NextResponse } from 'next/server';
import { readMentorRecords, saveOwnMentorRecords } from '@/utils/mentors';

const GRAPHQL_URL = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';
const MENTOR_MESSAGE = /mentor/i;

// POST: the caller's own mentor records are read from the platform WITH THEIR TOKEN (so nobody can
// report periods for someone else) and saved. Only "away" records whose message mentions mentoring
// are kept, and only their start, end and message.
export async function POST(request: Request) {
  try {
    const token = request.headers.get('x-platform-token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: '{ user { id login records { startAt endAt message typeName } } }' }),
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: 'Platform rejected token' }, { status: 401 });
    const data = await res.json();
    const me = data?.data?.user?.[0];
    if (!me) return NextResponse.json({ error: 'Platform rejected token' }, { status: 401 });
    const mentorRecords = (me.records || []).filter(
      (r: { typeName: string; message: string | null }) => r.typeName === 'away' && MENTOR_MESSAGE.test(r.message || '')
    );
    await saveOwnMentorRecords(me.id, me.login, mentorRecords);
    return NextResponse.json({ saved: mentorRecords.length });
  } catch (error) {
    console.error('Error saving mentor records:', error);
    return NextResponse.json({ error: 'Failed to save mentor records' }, { status: 500 });
  }
}

// PUT: read the exact mentor periods reported so far for the given auditor ids.
export async function PUT(request: Request) {
  try {
    const { userIds } = await request.json();
    if (!Array.isArray(userIds)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const ids = Array.from(new Set(userIds.filter((n: unknown): n is number => Number.isInteger(n)))).slice(0, 500);
    return NextResponse.json({ records: await readMentorRecords(ids) });
  } catch (error) {
    console.error('Error reading mentor records:', error);
    return NextResponse.json({ error: 'Failed to read mentor records' }, { status: 500 });
  }
}
