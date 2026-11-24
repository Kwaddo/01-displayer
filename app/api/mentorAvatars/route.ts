import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

// Avatars are set by staff, and mentors get one when they start: the shared "Audit Mentor" image
// or a personal photo. Returns, per avatar URL, whether it is the Audit Mentor image and the
// file's Last-Modified date (when it was applied), used as the start of that mentoring.
const AUDIT_MENTOR_SHA256 = '77ed5b3109c46766e8a63e2b35c9ddd015ebde3f30cce50b2eb1c83e097c0561';
const ALLOWED_PREFIX = 'https://learn.reboot01.com/git/avatars/';
const TTL_MS = 6 * 60 * 60 * 1000;

type AvatarInfo = { mentor: boolean; since: string | null };
const cache = new Map<string, AvatarInfo & { at: number }>();

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();
    if (!Array.isArray(urls)) {
      return NextResponse.json({ error: 'urls must be an array' }, { status: 400 });
    }
    // Only fetch platform avatar URLs (no arbitrary outbound requests).
    const list = Array.from(new Set(urls.filter((u: unknown): u is string => typeof u === 'string' && u.startsWith(ALLOWED_PREFIX)))).slice(0, 300);
    const avatars: Record<string, AvatarInfo> = {};
    await Promise.all(
      list.map(async (url) => {
        const hit = cache.get(url);
        if (hit && Date.now() - hit.at < TTL_MS) {
          avatars[url] = { mentor: hit.mentor, since: hit.since };
          return;
        }
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (01-displayer)' }, cache: 'no-store' });
          if (!res.ok) return;
          const buf = Buffer.from(await res.arrayBuffer());
          const mentor = createHash('sha256').update(buf).digest('hex') === AUDIT_MENTOR_SHA256;
          const lm = res.headers.get('last-modified');
          const since = lm && !Number.isNaN(Date.parse(lm)) ? new Date(lm).toISOString() : null;
          cache.set(url, { mentor, since, at: Date.now() });
          avatars[url] = { mentor, since };
        } catch {
          // unreachable avatar: treat as unknown
        }
      })
    );
    return NextResponse.json({ avatars });
  } catch (error) {
    console.error('Error checking mentor avatars:', error);
    return NextResponse.json({ error: 'Failed to check avatars' }, { status: 500 });
  }
}
