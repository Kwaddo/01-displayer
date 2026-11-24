import { neon } from '@neondatabase/serverless';

// Mentor-auditor registry kept in Neon.
//
// The platform only exposes other users' "Tech Team" / "Staff" labels through its slow public
// profile endpoint, and only their CURRENT labels. Every time a profile is read we record each
// mentor label as a period (since = the label's createdAt). When a label we saw earlier is gone,
// its period is closed (ended_at), so past mentoring is kept even after the label is removed.

export type Label = { labelName: string; createdAt: string; eventId: number | null };
export type MentorPeriod = { userId: number; label: string; since: string; endedAt: string | null };

export const MENTOR_LABELS = ['Tech Team', 'Staff'];
const PROFILE_URL = 'https://learn.reboot01.com/api/profile/public';

const sql = neon(process.env.DATABASE_URL!);

let ready: Promise<unknown> | null = null;
export function ensureMentorTables() {
  ready ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS auditor_labels (
        user_id integer PRIMARY KEY,
        labels jsonb,
        fetched_at timestamptz NOT NULL DEFAULT now()
      )`;
    // labels IS NULL marks a failed fetch; it is retried after a day, not on every page load.
    await sql`ALTER TABLE auditor_labels ALTER COLUMN labels DROP NOT NULL`;
    await sql`
      CREATE TABLE IF NOT EXISTS mentor_records (
        user_id integer NOT NULL,
        login text NOT NULL,
        start_at timestamptz NOT NULL,
        end_at timestamptz,
        message text,
        reported_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, start_at)
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS mentor_periods (
        user_id integer NOT NULL,
        login text,
        label text NOT NULL,
        since timestamptz NOT NULL,
        first_seen timestamptz NOT NULL DEFAULT now(),
        last_seen timestamptz NOT NULL DEFAULT now(),
        ended_at timestamptz,
        PRIMARY KEY (user_id, label, since)
      )`;
  })();
  return ready;
}

/** Slow (30-120s). Returns null on failure. */
export async function fetchProfileLabels(campus: string, userId: number, token: string, timeoutMs = 55000) {
  try {
    const res = await fetch(`${PROFILE_URL}/${campus}?userId=${userId}`, {
      headers: { 'x-jwt-token': token },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const labels: Label[] = (data?.labels || []).map((l: Label) => ({
      labelName: String(l.labelName),
      createdAt: String(l.createdAt),
      eventId: l.eventId ?? null,
    }));
    return { login: String(data?.login || ''), labels };
  } catch {
    return null;
  }
}

/** Save a freshly read label set: refresh the cache, open/refresh current periods, close vanished ones. */
export async function recordLabels(userId: number, login: string, labels: Label[]) {
  await ensureMentorTables();
  await sql`
    INSERT INTO auditor_labels (user_id, labels, fetched_at)
    VALUES (${userId}, ${JSON.stringify(labels)}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET labels = EXCLUDED.labels, fetched_at = now()
  `;
  const current = labels.filter((l) => MENTOR_LABELS.includes(l.labelName));
  for (const l of current) {
    await sql`
      INSERT INTO mentor_periods (user_id, login, label, since)
      VALUES (${userId}, ${login || null}, ${l.labelName}, ${l.createdAt})
      ON CONFLICT (user_id, label, since) DO UPDATE SET last_seen = now(), ended_at = NULL,
        login = COALESCE(EXCLUDED.login, mentor_periods.login)
    `;
  }
  const open = (await sql`
    SELECT label, since FROM mentor_periods WHERE user_id = ${userId} AND ended_at IS NULL
  `) as { label: string; since: string }[];
  for (const p of open) {
    const still = current.some((l) => l.labelName === p.label && Date.parse(l.createdAt) === Date.parse(p.since));
    if (!still) {
      await sql`
        UPDATE mentor_periods SET ended_at = now()
        WHERE user_id = ${userId} AND label = ${p.label} AND since = ${p.since} AND ended_at IS NULL
      `;
    }
  }
}

export async function recordFailure(userId: number) {
  await ensureMentorTables();
  await sql`
    INSERT INTO auditor_labels (user_id, labels, fetched_at) VALUES (${userId}, NULL, now())
    ON CONFLICT (user_id) DO UPDATE SET fetched_at = now() WHERE auditor_labels.labels IS NULL
  `;
}

/** Ids whose labels are fresh (or failed recently), and every recorded period for the given ids. */
export async function readRegistry(ids: number[], freshDays = 7) {
  await ensureMentorTables();
  const rows = (await sql`
    SELECT user_id, labels IS NULL AS failed FROM auditor_labels
    WHERE user_id = ANY(${ids})
      AND (
        (labels IS NOT NULL AND fetched_at > now() - make_interval(days => ${freshDays}))
        OR (labels IS NULL AND fetched_at > now() - interval '1 day')
      )
  `) as { user_id: number; failed: boolean }[];
  const periods = (await sql`
    SELECT user_id, label, since, ended_at FROM mentor_periods WHERE user_id = ANY(${ids})
  `) as { user_id: number; label: string; since: string; ended_at: string | null }[];
  return {
    known: new Set(rows.map((r) => r.user_id)),
    periods: periods.map<MentorPeriod>((p) => ({
      userId: p.user_id,
      label: p.label,
      since: new Date(p.since).toISOString(),
      endedAt: p.ended_at ? new Date(p.ended_at).toISOString() : null,
    })),
  };
}


// Exact mentor periods self-reported by mentors: when a mentor opens the dashboard, their own
// "away" records whose message mentions mentoring are saved here (start, end, message only).
export type MentorRecord = { userId: number; login: string; startAt: string; endAt: string | null; message: string | null };

export async function saveOwnMentorRecords(userId: number, login: string, records: { startAt: string; endAt: string | null; message: string | null }[]) {
  await ensureMentorTables();
  for (const r of records) {
    await sql`
      INSERT INTO mentor_records (user_id, login, start_at, end_at, message)
      VALUES (${userId}, ${login}, ${r.startAt}, ${r.endAt}, ${r.message})
      ON CONFLICT (user_id, start_at) DO UPDATE SET end_at = EXCLUDED.end_at, message = EXCLUDED.message, reported_at = now()
    `;
  }
}

export async function readMentorRecords(ids: number[]): Promise<MentorRecord[]> {
  await ensureMentorTables();
  const rows = (await sql`
    SELECT user_id, login, start_at, end_at, message FROM mentor_records WHERE user_id = ANY(${ids})
  `) as { user_id: number; login: string; start_at: string; end_at: string | null; message: string | null }[];
  return rows.map((r) => ({
    userId: r.user_id,
    login: r.login,
    startAt: new Date(r.start_at).toISOString(),
    endAt: r.end_at ? new Date(r.end_at).toISOString() : null,
    message: r.message,
  }));
}
