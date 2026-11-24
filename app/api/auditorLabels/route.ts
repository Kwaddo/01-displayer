import { NextResponse } from 'next/server';
import { fetchProfileLabels, readRegistry, recordFailure, recordLabels } from '@/utils/mentors';

// Returns the recorded mentor periods (Tech Team / Staff) for the given auditors from Neon, and
// refreshes up to two stale profiles per call from the platform's slow profile endpoint.
const FETCH_PER_REQUEST = 2;

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const token = request.headers.get('x-platform-token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userIds, campus, fetchMissing = true } = await request.json();
    if (!Array.isArray(userIds) || typeof campus !== 'string' || !/^[a-z0-9-]+$/.test(campus)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    const ids = Array.from(new Set(userIds.filter((n: unknown): n is number => Number.isInteger(n)))).slice(0, 500);

    let { known, periods } = await readRegistry(ids);
    let pending = ids.filter((id) => !known.has(id));
    if (fetchMissing && pending.length > 0) {
      await Promise.all(
        pending.slice(0, FETCH_PER_REQUEST).map(async (id) => {
          const profile = await fetchProfileLabels(campus, id, token);
          if (profile) await recordLabels(id, profile.login, profile.labels);
          else await recordFailure(id).catch(() => undefined);
        })
      );
      ({ known, periods } = await readRegistry(ids));
      pending = ids.filter((id) => !known.has(id));
    }
    return NextResponse.json({ periods, pending });
  } catch (error) {
    console.error('Error reading mentor registry:', error);
    return NextResponse.json({ error: 'Failed to read mentor registry' }, { status: 500 });
  }
}
