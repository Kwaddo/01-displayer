// Mentor auditors and the periods they held that role.
//
// The reboot01 GraphQL API does not expose other users' records (mentor duty is stored as an
// "away" record), so this roster is the source of truth. An audit counts as a mentor audit only
// when the auditor is listed here AND the audit happened inside [from, to].
//   from / to: ISO dates (YYYY-MM-DD). Leave `to` out if still mentoring, `from` out if always.
//   Use several entries for the same login when they mentored in separate periods.
export interface MentorPeriod {
  login: string;
  from?: string;
  to?: string;
}

export const MENTOR_ROSTER: MentorPeriod[] = [
  // { login: 'aaljamal', from: '2025-06-01' },
  // { login: 'haalbasara', from: '2025-01-10', to: '2025-12-20' },
];
