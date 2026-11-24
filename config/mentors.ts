// Mentor auditors and the periods they held that role.
//
// The reboot01 GraphQL API does not expose other users' records (mentor duty is stored as an
// "away" record), so this roster is the source of truth. An audit counts as a mentor audit when:
//   - the entry has `from` / `to` dates and the audit falls inside them, or
//   - the entry is `kind: 'tech'` with no dates (tech mentors always count), or
//   - the entry has no dates (student mentor auditor) and the auditor is NOT in the audited
//     person's cohort (a same-cohort auditor was a peer, not a mentor). Add dates to count
//     a same-cohort mentor's audits from the day they actually became a mentor.
// Use several entries for the same login when they mentored in separate periods.
export interface MentorPeriod {
  login: string;
  kind?: 'tech' | 'auditor';
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD, omit if still mentoring
}

export const MENTOR_ROSTER: MentorPeriod[] = [
  // Student mentor auditors (dates still needed for same-cohort ones)
  { login: 'saysharaf' },
  { login: 'mohamedahmed1' },
  { login: 'haalbasara' },
  { login: 'haaljafen' },
  { login: 'falmoath' },
  { login: 'fatali' },
  { login: 'dalabbas' },

  // ak1: periods taken from their own platform records ("Mentor auditor" away records),
  // then Tech Team since 2026-10-29.
  { login: 'ak1', from: '2025-06-25', to: '2025-12-22' },
  { login: 'ak1', from: '2026-01-12', to: '2026-01-28' },
  { login: 'ak1', kind: 'tech', from: '2026-10-29' },

  // Tech mentors (always count)
  { login: 'rihasan', kind: 'tech' },
  { login: 'hadwan', kind: 'tech' },
  { login: 'aalbraik', kind: 'tech' },
  { login: 'alikhalaf', kind: 'tech' },
  { login: 'ahkamal', kind: 'tech' },
  { login: 'abdeahmed', kind: 'tech' },
  { login: 'daalkhalaf', kind: 'tech' },
  { login: 'aalghanem', kind: 'tech' },
];
