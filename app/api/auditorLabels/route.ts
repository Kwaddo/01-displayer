import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Auditor "Staff" / "Tech Team" labels (with the date each was added) come from the platform's
// public profile endpoint, which is very slow (often 30-120s). Results are cached in Neon for
// everyone, and only a couple of missing profiles are fetched per request.
const sql = neon(process.env.DATABASE_URL!);
const PROFILE_URL = 'https://learn.reboot01.com/api/profile/public';
const FRESH_DAYS = 7;
const FETCH_PER_REQUEST = 2;

export const maxDuration = 60;

type Label = { labelName: string; createdAt: string; eventId: number | null };

let tableReady: Promise<unknown> | null = null;
function ensureTable() {
  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS auditor_labels (
      user_id integer PRIMARY KEY,
      labels jsonb NOT NULL,
      fetched_at timestamptz NOT NULL DEFAULT now()
    )`;
  return tableReady;
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('x-platform-token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userIds, campus, fetchMissing = true } = await request.json();
    if (!Array.isArray(userIds) || typeof campus !== 'string' || !/^[a-z0-9-]+$/.test(campus)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    const ids = Array.from(new Set(userIds.filter((n: unknown): n is number => Number.isInteger(n)))).slice(0, 500);
    await ensureTable();

    const labels: Record<number, Label[]> = {};
    const cached = (await sql`
      SELECT user_id, labels FROM auditor_labels
      WHERE user_id = ANY(${ids}) AND fetched_at > now() - make_interval(days => ${FRESH_DAYS})
    `) as { user_id: number; labels: Label[] }[];
    cached.forEach((row) => (labels[row.user_id] = row.labels));

    let pending = ids.filter((id) => !(id in labels));
    if (fetchMissing) {
      const now = pending.slice(0, FETCH_PER_REQUEST);
      await Promise.all(
        now.map(async (id) => {
          try {
            const res = await fetch(`${PROFILE_URL}/${campus}?userId=${id}`, {
              headers: { 'x-jwt-token': token },
              cache: 'no-store',
              signal: AbortSignal.timeout(55000),
            });
            if (!res.ok) return;
            const data = await res.json();
            const list: Label[] = (data?.labels || []).map((l: Label) => ({
              labelName: String(l.labelName),
              createdAt: String(l.createdAt),
              eventId: l.eventId ?? null,
            }));
            labels[id] = list;
            await sql`
              INSERT INTO auditor_labels (user_id, labels, fetched_at)
              VALUES (${id}, ${JSON.stringify(list)}::jsonb, now())
              ON CONFLICT (user_id) DO UPDATE SET labels = EXCLUDED.labels, fetched_at = now()
            `;
          } catch {
            // slow or failed profile: stays pending, retried on a later request
          }
        })
      );
      pending = ids.filter((id) => !(id in labels));
    }
    return NextResponse.json({ labels, pending });
  } catch (error) {
    console.error('Error fetching auditor labels:', error);
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}
