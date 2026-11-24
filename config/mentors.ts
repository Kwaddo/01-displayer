// Mentor roster (manual overrides). Students currently wearing the platform's "Audit Mentor"
// profile picture are detected automatically (app/api/mentorAvatars): their audits count from
// the date that avatar was applied. This roster covers everyone else. An audit counts when:
//   - the entry is `kind: 'tech'` with no dates (tech mentors always count), or
//   - the entry has `from` / `to` dates and the audit falls inside them, or
//   - the entry has no dates (student mentor) and the auditor is NOT in the audited person's cohort.
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

  // Tech mentors: counted from their platform "Tech Team" label date (mentor registry), not listed here.
  // Tech mentor from the DevOps projects onward (ak1's crud-master group opened 2026-03-29).
  { login: 'ralhalwa', kind: 'tech', from: '2026-03-29' },
];
