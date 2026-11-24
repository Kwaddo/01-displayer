// Mentor roster. Only people listed here can count as mentor auditors. An audit counts when:
//   - the entry is `kind: 'tech'` with no dates (tech mentors always count), or
//   - the entry has `from` / `to` dates and the audit falls inside them (use this for a student
//     mentor in the SAME cohort as the audited person), or
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
  // Cohort 3 (same cohort as ak1). Periods inferred from the Cohort 3 mentor-auditor batch in ak1's
  // own platform records (authored by staff): 2025-06-25..2025-12-22 and 2026-01-12..2026-01-28.
  { login: 'haalbasara', from: '2025-06-25', to: '2025-12-22' },
  { login: 'haalbasara', from: '2026-01-12', to: '2026-01-28' },
  { login: 'haaljafen' },
  { login: 'falmoath', from: '2025-06-25', to: '2025-12-22' },
  { login: 'falmoath', from: '2026-01-12', to: '2026-01-28' },
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
  { login: 'malhawi' }, // past mentor auditor (Cohort 2)

  { login: 'ak1' },

  // Tech mentors (always count)
  { login: 'aaljamal', kind: 'tech' },
  { login: 'yalmasri', kind: 'tech' },
  { login: 'nqasim', kind: 'tech' },
  { login: 'ralhalwa', kind: 'tech' },
  { login: 'aabdeen', kind: 'tech' },
];
