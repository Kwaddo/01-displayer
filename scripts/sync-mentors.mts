// Fill / refresh the Neon mentor registry from the platform's (slow) public profile endpoint.
//
//   node --env-file=.env.local scripts/sync-mentors.mts <platform JWT> [--campus bahrain] [--logins a,b,c]
//
// Reads: everyone who audited the token's owner, every user already in the registry (to detect
// removed labels), and any --logins. Labels already in the auditor_labels cache are replayed into
// mentor_periods first. No time limit, 4 profiles at a time.
import { neon } from '@neondatabase/serverless';
import { ensureMentorTables, fetchProfileLabels, recordLabels, recordFailure, type Label } from '../utils/mentors.ts';

const args = process.argv.slice(2);
const token = (args.find((a) => !a.startsWith('--')) || process.env.PLATFORM_TOKEN || '').replace(/^"|"$/g, '');
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const campus = opt('campus') || 'bahrain';
const extraLogins = (opt('logins') || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!token) {
  console.error('usage: node --env-file=.env.local scripts/sync-mentors.mts <platform JWT> [--campus bahrain] [--logins a,b]');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
async function gql(query: string, variables: object = {}) {
  const res = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e: { message: string }) => e.message).join(', '));
  return json.data;
}

await ensureMentorTables();

// 1) Replay cached labels into mentor periods (with logins looked up from GraphQL).
const cached = (await sql`SELECT user_id, labels FROM auditor_labels WHERE labels IS NOT NULL`) as { user_id: number; labels: Label[] }[];
const loginOf = new Map<number, string>(
  ((await gql('query($i: [Int!]!) { user_public_view(where: { id: { _in: $i } }) { id login } }', { i: cached.map((r) => r.user_id) }))
    .user_public_view as { id: number; login: string }[]).map((u) => [u.id, u.login])
);
for (const row of cached) await recordLabels(row.user_id, loginOf.get(row.user_id) || '', row.labels);
console.log(`replayed ${cached.length} cached profiles`);

// 2) Who to (re)read from the platform.
const me = (await gql('{ user { id login } }')).user[0];
const audits = (await gql(
  `query($u: Int!) { audit(where: { auditorId: { _neq: $u }, group: { _or: [{ captainId: { _eq: $u } }, { members: { userId: { _eq: $u } } }] } }) { auditorId } }`,
  { u: me.id }
)).audit as { auditorId: number }[];
const extra = extraLogins.length
  ? ((await gql('query($l: [String!]!) { user_public_view(where: { login: { _in: $l } }) { id } }', { l: extraLogins })).user_public_view as { id: number }[])
  : [];
const registered = (await sql`SELECT DISTINCT user_id FROM mentor_periods`) as { user_id: number }[];
const fresh = new Set(((await sql`SELECT user_id FROM auditor_labels WHERE labels IS NOT NULL AND fetched_at > now() - interval '1 day'`) as { user_id: number }[]).map((r) => r.user_id));
const ids = Array.from(new Set([...audits.map((a) => a.auditorId), ...extra.map((u) => u.id), ...registered.map((r) => r.user_id)])).filter((id) => !fresh.has(id));
console.log(`${me.login}: reading ${ids.length} profiles (skipping ${fresh.size} read in the last day)...`);

let done = 0, failed = 0;
const queue = [...ids];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const id = queue.shift()!;
      const profile = await fetchProfileLabels(campus, id, token, 180000);
      if (profile) {
        await recordLabels(id, profile.login, profile.labels);
        const m = profile.labels.filter((l) => l.labelName === 'Tech Team' || l.labelName === 'Staff');
        if (m.length) console.log(`  ${profile.login}: ${m.map((l) => `${l.labelName} since ${l.createdAt.slice(0, 10)}`).join(', ')}`);
      } else {
        failed++;
        await recordFailure(id);
      }
      done++;
      if (done % 10 === 0) console.log(`  ${done}/${ids.length}`);
    }
  })
);
const summary = (await sql`
  SELECT login, label, since::date, ended_at::date FROM mentor_periods ORDER BY label, since
`) as { login: string; label: string; since: string; ended_at: string | null }[];
console.log(`done: ${done - failed} read, ${failed} failed. Registry now has ${summary.length} mentor periods.`);
