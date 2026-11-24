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

// NOTE: entries without `from` count EVERY audit by that login, including audits made back when
// they were still an ordinary peer. Add a `from` (and `to`) date for each to make this accurate.
export const MENTOR_ROSTER: MentorPeriod[] = [
  { login: 'saysharaf' },
  { login: 'mohamedahmed1' },
  { login: 'haalbasara' },
  { login: 'haaljafen' },
  { login: 'falmoath' },
  { login: 'fatali' },
  { login: 'dalabbas' },
];
