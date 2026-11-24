// Mentor roster. An audit counts as a mentor audit when ANY of these holds:
//   - the auditor is not in the audited person's cohort (assumed mentor automatically), or
//   - the auditor is a `kind: 'tech'` entry with no dates (tech mentors always count), or
//   - the entry has `from` / `to` dates and the audit falls inside them. Use this for a mentor in
//     the SAME cohort as the audited person, otherwise their peer-era audits would not count.
// Undated student mentors below only document who they are; the cohort rule decides their audits.
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
  { login: 'rihasan' },
  { login: 'hadwan' },
  { login: 'aalbraik' },
  { login: 'alikhalaf' },
  { login: 'ahkamal' },
  { login: 'abdeahmed' },
  { login: 'daalkhalaf' },
  { login: 'aalghanem' },

  { login: 'ak1' },

  // Tech mentors (always count)
  { login: 'aaljamal', kind: 'tech' },
  { login: 'yalmasri', kind: 'tech' },
  { login: 'nqasim', kind: 'tech' },
  { login: 'ralhalwa', kind: 'tech' },
  { login: 'aabdeen', kind: 'tech' },
];
