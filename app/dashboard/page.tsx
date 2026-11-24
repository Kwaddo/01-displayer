"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DynamicGraph = dynamic(() => import('@/components/graph'), { ssr: false });
const DynamicMinesweeper = dynamic(() => import('@/components/minesweeper'), { ssr: false });
const DynamicSpaceInvaders = dynamic(() => import('@/components/invaders'), { ssr: false });

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchGraphQL, AuthExpiredError } from '@/utils/info';
import { logout } from '@/utils/user';
import styles from '@/styles/home.module.css';
import Windows98Splash from '@/components/splash';
import Window, { WinState } from '@/components/window';
import { MENTOR_ROSTER } from '@/config/mentors';
import winStyles from '@/styles/window.module.css';
import Icon from '@/components/icons';

interface Group {
  campus: string;
  captainId: number;
  captainLogin: string;
  createdAt: string;
  eventId: number;
  id: number;
  objectId: number;
  path: string;
  status: string;
  updatedAt: string;
}

interface User {
  id: number;
  auditRatio: number;
  email: string;
  firstName: string;
  lastName: string;
  login: string;
  totalDown: number;
  totalUp: number;
  groupsByCaptainid: Group[];
  TransactionsFiltered1: { amount: number; type: string; path: string }[];
  TransactionsFiltered2: { amount: number; type: string; path: string }[];
}

interface XpData {
  xp: number;
  count: number;
}

interface MentorEntry {
  login: string;
  count: number;
  projects: number;
  first: string;
  last: string;
  audits: { date: string; project: string; reason?: string }[];
  role?: string;
}

// Completed audits (succeeded/failed) done BY others ON groups the user belongs to,
// across every event/cohort. Cancelled/expired/reassigned audits are excluded.
// All audits (any closure) are fetched so we can tell how each audit was created; only completed
// ones (succeeded/failed) are counted.
const auditQuery = `query Audits($uid: Int!) {
  audit(where: {
    auditorId: {_neq: $uid},
    group: {_or: [{captainId: {_eq: $uid}}, {members: {userId: {_eq: $uid}}}]}
  }) {
    auditorId
    auditorLogin
    auditor { avatarUrl }
    auditedAt
    createdAt
    closedAt
    closureType
    group {
      id
      path
      eventId
      event { path }
    }
  }
}`;

interface GameData {
  name: string;
  level: number;
  attempts: number;
}

// Step 1: who am I, and which module event paths (e.g. /campus/xx-module) am I enrolled in.
const userIdQuery = `query Me { user { id } }`;
const modulePathsQuery = `query Modules($uid: Int!) {
  event_user(where: {userId: {_eq: $uid}, event: {path: {_regex: "^/[^/]+/[^/]+-module$"}}}) {
    event { path }
  }
}`;

// Root piscine + module events a user belongs to. Sharing one with the audited person = same cohort
// (this also catches drop-outs, who keep their piscine enrollment after leaving the module).
const cohortQuery = `query Cohorts($ids: [Int!]!) {
  event_user(where: {userId: {_in: $ids}, event: {path: {_regex: "^/[^/]+/[^/]+-(module|piscine)$"}}}) {
    userId
    eventId
  }
}`;

const openRecordsQuery = `query OpenRecords($ids: [Int!]!) {
  record_public_view(where: {userId: {_in: $ids}}) { userId startAt }
}`;

const query = `query User($moduleLike: String!, $modulePaths: [String!]!) {
  user {
      id
      auditRatio
      email
      firstName
      lastName
      login
      totalDown
      totalUp
      groupsByCaptainid {
          campus
          captainId
          captainLogin
          createdAt
          eventId
          id
          objectId
          path
          status
          updatedAt
      }
      TransactionsFiltered1: transactions(where: {type: {_eq: "xp"}, path: { _like: $moduleLike, _nregex: "^.*(piscine-js/|piscine-rust/|piscine-ui/|piscine-ux/).*$" }}) {
          amount
          type
      		path
      }
      TransactionsFiltered2: transactions(where: {type: {_eq: "level"},  path: { _like: $moduleLike, _nregex: "^.*(piscine-js/|piscine-rust/|piscine-ui/|piscine-ux/).*$" }}, order_by: {amount: desc}, limit: 1) {
          amount
         type
         path
      }
  }
  event_user(where: { event: { path: { _in: $modulePaths } } }) {
      level
      userId
      userLogin
      eventId
  }
  transaction {
      amount
      path
      type
      userLogin
      eventId
  }
  toad_session_game_results {
    level
    result {
      name
    }
    attempts
  }
}`;

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

const WIN_IDS = ['info', 'notes', 'audit', 'levels', 'game', 'mentors', 'mines', 'color', 'invaders'] as const;
type WinId = typeof WIN_IDS[number];
const WIN_TITLES: Record<WinId, string> = {
  info: 'USER INFORMATION',
  notes: 'NOTEBOOK',
  audit: 'AUDIT RATIO',
  levels: 'USER LEVELS',
  game: 'GAME INFO',
  mentors: 'AUDITOR LEADERBOARD',
  mines: 'MINESWEEPER',
  color: 'COLOR',
  invaders: 'SPACE INVADERS',
};
const WIN_SIZE: Record<WinId, [number, number]> = {
  info: [360, 300], notes: [340, 300], audit: [400, 340], levels: [400, 340], game: [440, 340],
  mentors: [380, 340], mines: [380, 440], color: [270, 130], invaders: [680, 580],
};
// Smallest size at which each window's content still fits and stays usable.
const WIN_MIN: Record<WinId, [number, number]> = {
  info: [280, 240], notes: [220, 160], audit: [320, 280], levels: [340, 280], game: [360, 300],
  mentors: [300, 240], mines: [320, 400], color: [240, 100], invaders: [340, 320],
};
// Desktop shortcut labels, like file names under icons.
const WIN_LABELS: Record<WinId, string> = {
  info: 'User Info', notes: 'Notebook', audit: 'Audit Ratio', levels: 'User Levels', game: 'Game Info',
  mentors: 'Auditors', mines: 'Minesweeper', color: 'Display', invaders: 'Space Invaders',
};
// Hidden on tablets/phones (keyboard-only game).
const HIDE_ON_TABLET: Partial<Record<WinId, boolean>> = { invaders: true };
const WIN_OPEN: Record<WinId, boolean> = {
  info: true, notes: true, audit: true, levels: true, game: true, mentors: true, mines: false, color: false, invaders: false,
};
const TASKBAR_H = 30;
const PAD = 12;
const ICON_COL = 84; // width reserved on the left for the desktop icon column

// Tile the initially-open windows in rows that fit the desktop; stack the rest in a cascade.
function layoutAll(dw: number, dh: number): Record<WinId, WinState> {
  const out = {} as Record<WinId, WinState>;
  const narrow = dw < 700;
  const left = narrow ? PAD : ICON_COL + PAD; // leave the icon column visible
  let x = left, y = PAD, rowH = 0, z = 10;
  WIN_IDS.forEach((id, i) => {
    const w = Math.max(Math.min(WIN_SIZE[id][0], dw - left - PAD), Math.min(WIN_MIN[id][0], dw));
    const h = Math.max(Math.min(WIN_SIZE[id][1], dh - PAD * 2), Math.min(WIN_MIN[id][1], dh));
    let px: number, py: number;
    if (narrow || !WIN_OPEN[id]) {
      px = Math.min(left + i * 20, Math.max(0, dw - w));
      py = Math.min(PAD + i * 20, Math.max(0, dh - h));
    } else {
      if (x + w > dw - PAD && x > left) { x = left; y += rowH + PAD; rowH = 0; }
      px = x; py = y;
      if (py + h > dh) { // out of vertical room: overlap in a cascade instead of hiding
        px = Math.min(left + i * 24, Math.max(0, dw - w));
        py = Math.min(PAD + i * 24, Math.max(0, dh - h));
      }
      x += w + PAD;
      rowH = Math.max(rowH, h);
    }
    out[id] = { x: px, y: py, w: narrow ? Math.max(dw - PAD * 2, Math.min(WIN_MIN[id][0], dw)) : w, h, z: z++, open: WIN_OPEN[id], min: false, max: false };
  });
  return out;
}

export default function HomePage() {
  const [userData, setUserData] = useState<User | null>(null);
  const [xpDistribution, setXpDistribution] = useState<XpData[]>([]);
  const [gameData, setGameData] = useState<GameData[]>([]);
  const [xpAmount, setXpAmount] = useState<number>(0);
  const [levelAmount, setLevelAmount] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [lastProject, setLastProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mentors, setMentors] = useState<MentorEntry[]>([]);
  const [allAuditors, setAllAuditors] = useState<MentorEntry[]>([]);
  const [auditTab, setAuditTab] = useState<'mentors' | 'all'>('mentors');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      document.body.classList.add('dashboard-background');
      return () => {
        document.body.classList.remove('dashboard-background');
      };
    }
  }, [isClient])
  const [notebookContent, setNotebookContent] = useState('');
  const [colorId, getColor] = useState<number>(0);
  const [color, setColor] = useState<number>(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [siscore, setScore] = useState<number>(0);
  const [score, saveScore] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      setShowSplash(false);
    }, 3000)
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!isClient) return;

    const fetchData = async () => {
      try {
        if (window === undefined) {
          console.error('window is undefined');
          return;
        }
        const token = window?.localStorage?.getItem('jwtToken');
        if (!token) {
          router.replace('/signin');
          return;
        }
        const me = await fetchGraphQL(userIdQuery);
        const uid = me?.user?.[0]?.id;
        if (!uid) throw new Error('User data not found.');
        const mods = await fetchGraphQL(modulePathsQuery, { uid });
        const modulePaths: string[] = Array.from(
          new Set<string>((mods?.event_user || []).map((e: { event: { path: string } }) => e.event.path))
        );
        if (modulePaths.length === 0) throw new Error('No module enrollment found.');
        const moduleLike = `%${modulePaths[0].split('/').pop()}%`;
        const data = await fetchGraphQL(query, { moduleLike, modulePaths });
        if (data?.user && data.user.length > 0) {
          const loggedInUser = data.user[0] as User;
          loggedInUser.auditRatio = parseFloat(loggedInUser.auditRatio.toFixed(1));
          setUserData(loggedInUser);
          const totalXP = data.user[0].TransactionsFiltered1.reduce((acc: number, transaction: { amount: number }) => {
            return acc + transaction.amount;
          }, 0);
          setXpAmount(totalXP);
          const level = parseFloat(data.user[0].TransactionsFiltered2[0].amount.toFixed(3));
          setLevelAmount(level);
          const path = data.user[0].TransactionsFiltered2[0].path;
          const newPath = path.substring(path.lastIndexOf('/') + 1);
          const formattedPath = newPath
            .replace(/-/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          setLastProject(formattedPath);
          const xpCounts = data.event_user.reduce((acc: { [level: number]: number }, event: { level: number }) => {
            acc[event.level] = (acc[event.level] || 0) + 1;
            return acc;
          }, {});
          const xpData = Object.entries(xpCounts).map(([xp, count]) => ({
            xp: parseFloat(xp),
            count: typeof count === 'number' ? count : parseFloat(String(count)),
          })).sort((a, b) => b.xp - a.xp);
          setXpDistribution(xpData);
          const totalUsers = xpData.reduce((acc, item) => acc + item.count, 0);
          setTotalUsers(totalUsers);
          const gData = data?.toad_session_game_results.map((result: { result: { name: string }, level: number, attempts: number }) => ({
            name: result.result.name,
            level: result.level,
            attempts: result.attempts,
          })) || [];
          setGameData(gData);
          try {
            const auditData = await fetchGraphQL(auditQuery, { uid: loggedInUser.id });
            type Row = { auditorId: number; auditorLogin: string; auditor?: { avatarUrl: string | null } | null; auditedAt: string | null; createdAt: string; closedAt?: string | null; closureType?: string | null; group: { id: number; path: string; eventId: number; event: { path: string } } };
            const allAudits: Row[] = auditData?.audit || [];
            const rows: Row[] = allAudits.filter((r) => r.closureType === 'succeeded' || r.closureType === 'failed');
            // "Added by hand": the audit was created on its own (not in the automatic batch generated at
            // submission, and not a takeover of a reassigned audit). That is staff putting a specific
            // auditor on the project, which on real data has only ever been a mentor.
            const byGroup: Record<number, Row[]> = {};
            allAudits.forEach((r) => (byGroup[r.group.id] ||= []).push(r));
            const manualAdd = new Set<Row>();
            rows.forEach((r) => {
              const c = Date.parse(r.createdAt);
              const siblings = byGroup[r.group.id] || [];
              const batch = siblings.filter((b) => Math.abs(Date.parse(b.createdAt) - c) <= 3000).length;
              const takeover = siblings.some((b) => b !== r && b.closureType === 'reassigned' && b.closedAt && Math.abs(Date.parse(b.closedAt) - c) <= 5000);
              if (batch === 1 && !takeover) manualAdd.add(r);
            });
            const idOf: Record<string, number> = {};
            rows.forEach((r) => (idOf[r.auditorLogin] = r.auditorId));
            const summarize = (list: Row[], why?: (r: Row) => string | null, roleOf?: (auditorId: number) => string): MentorEntry[] => {
              const stats: Record<number, MentorEntry & { groups: Set<number> }> = {};
              list.forEach((r) => {
                const when = r.auditedAt || r.createdAt;
                const e = stats[r.auditorId] || (stats[r.auditorId] = { login: r.auditorLogin, count: 0, projects: 0, first: when, last: when, audits: [], groups: new Set() });
                e.count++;
                e.groups.add(r.group.id);
                e.audits.push({ date: when, project: r.group.path.split('/').pop() || '', reason: why?.(r) || undefined });
                if (when < e.first) e.first = when;
                if (when > e.last) e.last = when;
              });
              return Object.values(stats)
                .map((e) => ({ login: e.login, count: e.count, projects: e.groups.size, first: e.first, last: e.last, audits: e.audits.sort((a, b) => a.date.localeCompare(b.date)), role: roleOf?.(idOf[e.login]) }))
                .sort((a, b) => b.count - a.count || a.login.localeCompare(b.login));
            };
            // Only people on the roster (or with the Audit Mentor avatar) can be mentor audits. Piscine
            // audits by student mentors are treated as peer audits. Dated entries count inside their periods; tech mentors always count;
            // an undated student mentor counts only when they are NOT in the audited person's cohort.
            const rosterLogins = new Set(MENTOR_ROSTER.map((m) => m.login.toLowerCase()));
            const rosterIds = Array.from(new Set(rows.filter((r) => rosterLogins.has(r.auditorLogin.toLowerCase())).map((r) => r.auditorId)));
            const cohorts: Record<number, Set<number>> = {};
            if (rosterIds.length > 0) {
              const eu = await fetchGraphQL(cohortQuery, { ids: [...rosterIds, loggedInUser.id] });
              (eu?.event_user || []).forEach((e: { userId: number; eventId: number }) => {
                (cohorts[e.userId] || (cohorts[e.userId] = new Set())).add(e.eventId);
              });
            }
            const myCohorts = cohorts[loggedInUser.id] || new Set<number>();
            // Avatars are uploaded by staff (only ~40 accounts have one), and mentors get one when they
            // start: either the shared "Audit Mentor" image or a personal photo. The avatar file's
            // Last-Modified date marks the start of that mentoring.
            const mentorSince: Record<number, number> = {};
            const avatarKind: Record<number, string> = {};
            try {
              const urls = Array.from(new Set(rows.map((r) => r.auditor?.avatarUrl).filter((u): u is string => !!u)));
              if (urls.length > 0) {
                const res = await fetch('/api/mentorAvatars', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ urls }),
                });
                const { avatars } = await res.json();
                rows.forEach((r) => {
                  const a = r.auditor?.avatarUrl ? avatars?.[r.auditor.avatarUrl] : null;
                  if (a?.since) {
                    mentorSince[r.auditorId] = Date.parse(a.since);
                    avatarKind[r.auditorId] = `${a.mentor ? 'Audit Mentor avatar' : 'staff-set avatar'} since ${a.since.slice(0, 10)}`;
                  }
                });
              }
            } catch (avatarErr) {
              console.error('Failed to check mentor avatars:', avatarErr);
            }
            // Past mentors (avatar but no current Tech Team label): their mentoring ended no later than the
            // start of their current open record (status change that replaced it). Estimate, not proof.
            const mentorUntil: Record<number, number> = {};
            try {
              const avatarIds = Object.keys(mentorSince).map(Number);
              if (avatarIds.length > 0) {
                const rec = await fetchGraphQL(openRecordsQuery, { ids: avatarIds });
                (rec?.record_public_view || []).forEach((x: { userId: number; startAt: string }) => {
                  const start = Date.parse(x.startAt);
                  if (start > mentorSince[x.userId] && (mentorUntil[x.userId] === undefined || start < mentorUntil[x.userId])) {
                    mentorUntil[x.userId] = start;
                  }
                });
              }
            } catch (recErr) {
              console.error('Failed to load open records:', recErr);
            }
            const sameCohort = (auditorId: number) => Array.from(cohorts[auditorId] || []).some((e) => myCohorts.has(e));
            type Period = { userId: number; label: string; since: string; endedAt: string | null };
            // Exact mentor periods self-reported by mentors (their own "Mentor auditor" away records).
            type ExactRecord = { userId: number; startAt: string; endAt: string | null; message: string | null };
            let exact: ExactRecord[] = [];
            try {
              const res = await fetch('/api/mentorRecords', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: Array.from(new Set(rows.map((r) => r.auditorId))) }),
              });
              if (res.ok) exact = (await res.json()).records || [];
            } catch (exactErr) {
              console.error('Failed to read mentor records:', exactErr);
            }
            const dayStart = (iso: string) => Date.parse(iso.slice(0, 10));
            // Decision order: roster dates (manual override) > added-by-hand audit > recorded Tech Team periods (from the
            // Neon mentor registry, including ended ones) > Audit Mentor avatar date > undated roster entry.
            const makeWhy = (periods: Period[]) => (r: Row): string | null => {
              const isPiscine = !!r.group.event?.path?.includes('piscine');
              const t = Date.parse(r.auditedAt || r.createdAt);
              const login = r.auditorLogin.toLowerCase();
              const dated = MENTOR_ROSTER.filter((m) => m.login.toLowerCase() === login && (m.from || m.to));
              if (dated.length > 0) {
                return dated.some((m) => (!m.from || t >= Date.parse(m.from)) && (!m.to || t <= Date.parse(m.to) + 86400000)) ? 'roster period' : null;
              }
              const rec = exact.find((x) => x.userId === r.auditorId && t >= Date.parse(x.startAt) && (!x.endAt || t <= Date.parse(x.endAt)));
              if (rec) return `mentor record ${rec.startAt.slice(0, 10)} to ${rec.endAt ? rec.endAt.slice(0, 10) : 'now'} (exact)`;
              if (manualAdd.has(r)) return 'added by hand';
              const techPeriods = periods.filter((p) => p.userId === r.auditorId && p.label === 'Tech Team');
              const hit = techPeriods.find((p) => t >= dayStart(p.since) && (!p.endedAt || t <= Date.parse(p.endedAt)));
              if (hit) return hit.endedAt ? 'past Tech Team' : 'Tech Team';
              if (!isPiscine && mentorSince[r.auditorId] !== undefined && t >= mentorSince[r.auditorId]) {
                const until = techPeriods.length === 0 ? mentorUntil[r.auditorId] : undefined;
                if (until === undefined) return avatarKind[r.auditorId];
                if (t <= until) return `past mentor (est.): ${avatarKind[r.auditorId]}, until ~${new Date(until).toISOString().slice(0, 10)}`;
              }
              if (techPeriods.length > 0 || mentorSince[r.auditorId] !== undefined) return null;
              const entry = MENTOR_ROSTER.find((m) => m.login.toLowerCase() === login);
              if (!entry) return null;
              if (entry.kind === 'tech') return 'roster';
              // Piscine audits by student mentors are peer audits.
              return !isPiscine && !sameCohort(r.auditorId) ? 'roster (other cohort)' : null;
            };
            // Staff supersedes Tech Team when someone has both labels.
            const makeRoleOf = (periods: Period[]) => (auditorId: number) => {
              const own = periods.filter((p) => p.userId === auditorId);
              if (own.some((p) => p.label === 'Staff')) return 'Staff';
              if (own.some((p) => p.label === 'Tech Team' && !p.endedAt)) return 'Tech Team';
              if (own.some((p) => p.label === 'Tech Team') || mentorUntil[auditorId] !== undefined) return 'past mentor';
              if (mentorSince[auditorId] !== undefined) return 'mentor (avatar)';
              return 'mentor';
            };
            const mentorList = (periods: Period[]) => {
              const why = makeWhy(periods);
              return summarize(rows.filter((r) => why(r) !== null), why, makeRoleOf(periods));
            };
            setAllAuditors(summarize(rows));
            setMentors(mentorList([]));

            // Mentor periods come from the Neon registry (fast). Profiles not yet recorded are read from the
            // platform's slow profile endpoint in the background and saved to the registry.
            const platformToken = window.localStorage.getItem('jwtToken')?.replace(/^"|"$/g, '') || '';
            // Share this user's own mentor periods (only "away" records mentioning mentoring) so everyone's
            // leaderboard gets exact dates for them.
            if (platformToken) {
              fetch('/api/mentorRecords', { method: 'POST', headers: { 'x-platform-token': platformToken } }).catch(() => undefined);
            }
            const campus = modulePaths[0]?.split('/')[1] || '';
            const auditorIds = Array.from(new Set(rows.map((r) => r.auditorId)));
            if (platformToken && campus && auditorIds.length > 0) {
              let periods: Period[] = [];
              const call = async (userIds: number[], fetchMissing: boolean) => {
                try {
                  const res = await fetch('/api/auditorLabels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-platform-token': platformToken },
                    body: JSON.stringify({ userIds, campus, fetchMissing }),
                  });
                  if (!res.ok) return userIds;
                  const data = await res.json();
                  const seen = new Set(userIds);
                  periods = [...periods.filter((p) => !seen.has(p.userId)), ...((data.periods || []) as Period[])];
                  return (data.pending || []) as number[];
                } catch (labelErr) {
                  console.error('Failed to load auditor labels:', labelErr);
                  return userIds;
                }
              };
              // 1) Use everything already recorded (fast) and render. 2) Quietly read at most 4 unrecorded
              //    profiles per page load (busiest auditors first); the registry fills up over visits.
              const refresh = () => setMentors(mentorList(periods));
              const auditCount: Record<number, number> = {};
              rows.forEach((r) => (auditCount[r.auditorId] = (auditCount[r.auditorId] || 0) + 1));
              const pending = (await call(auditorIds, false)).sort((x, y) => (auditCount[y] || 0) - (auditCount[x] || 0));
              refresh();
              const background = pending.slice(0, 4);
              if (background.length > 0) {
                Promise.all([background.slice(0, 2), background.slice(2, 4)].filter((c) => c.length > 0).map((c) => call(c, true))).then(refresh);
              }
            }
          } catch (auditErr) {
            if (auditErr instanceof AuthExpiredError) throw auditErr;
            console.error('Failed to load mentor audits:', auditErr);
          }
        } else {
          throw new Error('User data not found.');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        if (err instanceof AuthExpiredError) {
          logout();
          router.replace('/signin');
          return;
        }
        setError('Failed to load user data.');
      } finally {
        setLoading(false);
      }
    }; fetchData();
  }, [router, isClient]);

  const colorMap = useMemo(() => ({
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
  }), []);
  const [desk, setDesk] = useState({ w: 1200, h: 700 });
  const [wins, setWins] = useState<Record<WinId, WinState> | null>(null);
  const [activeId, setActiveId] = useState<WinId | null>(null);
  const [tasks, setTasks] = useState<WinId[]>(() => WIN_IDS.filter((id) => WIN_OPEN[id]));
  const [selectedIcon, setSelectedIcon] = useState<WinId | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState('');
  const zTop = useRef(10);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!startOpen) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as HTMLElement).closest('[data-start]')) setStartOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', close); };
  }, [startOpen]);

  useEffect(() => {
    if (!isClient) return;
    const measure = () => ({ w: window.innerWidth, h: Math.max(200, window.innerHeight - TASKBAR_H) });
    const d = measure();
    setDesk(d);
    setWins(layoutAll(d.w, d.h));
    const onResize = () => {
      const nd = measure();
      setDesk(nd);
      // keep every window reachable and inside the desktop after a resize / rotate
      setWins(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        WIN_IDS.forEach(id => {
          const w = next[id];
          const width = Math.min(Math.max(w.w, WIN_MIN[id][0]), nd.w);
          const height = Math.min(Math.max(w.h, WIN_MIN[id][1]), nd.h);
          next[id] = {
            ...w,
            w: width,
            h: height,
            x: Math.min(Math.max(w.x, 0), Math.max(0, nd.w - width)),
            y: Math.min(Math.max(w.y, 0), Math.max(0, nd.h - height)),
          };
        });
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isClient]);

  const focusWin = useCallback((id: WinId) => {
    setActiveId(id);
    setWins(prev => (prev ? { ...prev, [id]: { ...prev[id], z: ++zTop.current } } : prev));
  }, []);

  const patchWin = useCallback((id: WinId, patch: Partial<WinState>) => {
    setWins(prev => (prev ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }, []);

  // Open (or bring back) a window and put it on top.
  const openWin = (id: WinId) => {
    patchWin(id, { open: true, min: false, z: ++zTop.current });
    setTasks((t) => (t.includes(id) ? t : [...t, id]));
    setActiveId(id);
  };
  const minimizeWin = (id: WinId) => {
    patchWin(id, { min: true });
    setActiveId((a) => (a === id ? null : a));
  };
  const closeWin = (id: WinId) => {
    patchWin(id, { open: false, min: false });
    setTasks((t) => t.filter((x) => x !== id));
    setActiveId((a) => (a === id ? null : a));
  };
  // Taskbar button: restore if minimized, minimize if already in front, otherwise bring to front.
  const onTaskClick = (id: WinId) => {
    if (!wins) return;
    if (wins[id].min) openWin(id);
    else if (activeId === id) minimizeWin(id);
    else focusWin(id);
  };

  useEffect(() => {
    const userToken = window?.localStorage.getItem('jwtToken');
    const userId = userData?.login;
    if (isDbInitialized && userId && userToken) {
      const insertUserData = async () => {
        try {
          const response = await fetch('/api/insertUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });

          const data = await response.json();
          if (response.ok) {
            console.log(data.message);
            const fetchNotes = async () => {
              try {
                const response = await fetch('/api/getNotes', {
                  method: 'GET',
                  headers: {
                    'Authorization': userId,
                  },
                });

                const data = await response.json();
                if (response.ok) {
                  setNotebookContent(data.notebookcontent || '');
                } else {
                  setError(data.error || 'Failed to fetch notebook content');
                }
              } catch (error) {
                setError('An error occurred while fetching notes: ' + error);
              }
            };
            const fetchColor = async () => {
              try {
                const response = await fetch('/api/getColor', {
                  method: 'GET',
                  headers: {
                    'Authorization': userId,
                  },
                });

                const data = await response.json();
                if (response.ok) {
                  getColor(data.colorId || '');
                } else {
                  setError(data.error || 'Failed to fetch color');
                }
              } catch (error) {
                setError('An error occurred while fetching color: ' + error);
              }
            };
            const fetchScore = async () => {
              try {
                const response = await fetch('/api/getScore', {
                  method: 'GET',
                  headers: {
                    'Authorization': userId,
                  },
                });

                const data = await response.json();
                if (response.ok) {
                  setScore(data.siscore || '');
                } else {
                  setError(data.error || 'Failed to fetch score');
                }
              } catch (error) {
                setError('An error occurred while fetching score: ' + error);
              }
            };

            fetchNotes();
            fetchColor();
            fetchScore();
          } else {
            setError(data.error || 'Failed to insert user data');
          }
        } catch (error) {
          setError('Error inserting user data: ' + error);
        }
      };

      insertUserData();
    }
  }, [isDbInitialized, userData]);

  const handleLogout = () => {
    logout();
    setError(null);
    router.replace('/signin');
  };

  const capitalizeWords = (str: string | undefined) => {
    if (!str) return '';
    return str
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const response = await fetch('/api/initDb');
        const data = await response.json();

        if (response.ok) {
          console.log(data.message);
          setIsDbInitialized(true);
        } else {
          console.error(data.error);
          setError('Database initialization failed');
        }
      } catch (error) {
        console.error('Error initializing database:', error);
        setError('Failed to initialize database');
      }
    };

    initializeDatabase();
  }, []);

  const saveNotes = useCallback(async (newContent: string) => {
    if (!isDbInitialized) {
      setError('Database not initialized');
      return;
    }

    try {
      const response = await fetch('/api/saveNotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData?.login,
          notebookcontent: newContent,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save notes');
      }
    } catch (error) {
      setError('An error occurred while saving notes: ' + error);
    }
  }, [isDbInitialized, userData?.login]);

  const saveColor = useCallback(async (newColor: number) => {
    if (!isDbInitialized) {
      setError('Database not initialized');
      return;
    }

    try {
      const response = await fetch('/api/setColor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData?.login,
          color_id: newColor,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save color');
      }
    } catch (error) {
      setError('An error occurred while saving color: ' + error);
    }
  }, [isDbInitialized, userData?.login]);

  const sendScore = useCallback(async (newScore: number) => {
    console.log('Sending score:', newScore);
    if (!isDbInitialized) {
      setError('Database not initialized');
      return;
    }
    const updatedScore = newScore || score;  // Fallback to the current score if newScore is invalid
    if (updatedScore > score) {
      try {
        const response = await fetch('/api/saveScore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userData?.login,
            siscore: updatedScore,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Failed to save score');
        }
      } catch (error) {
        setError('An error occurred while saving score: ' + error);
      }
    }
  }, [isDbInitialized, score, userData?.login]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setNotebookContent(newContent);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const newTimeoutId = setTimeout(() => saveNotes(newContent), 5000);
    setTimeoutId(newTimeoutId);
  };

  useEffect(() => {
    setColor(colorMap[colorId as keyof typeof colorMap] || 1);
  }, [colorId, colorMap]);

  useEffect(() => {
    saveScore(siscore);
  }, [siscore]);

  const getColorByValue = (value: number) => {
    switch (value) {
      case 2:
        return '#ff6347';
      case 3:
        return '#8a2be2';
      case 4:
        return '#32cd32';
      case 5:
        return '#ff4500';
      default:
        return '#008080';
    }
  };

  useEffect(() => {
    if (isClient) {
      switch (color) {
        case 2:
          document.body.style.background = 'linear-gradient(45deg, #ff6347 25%, #ff0000 50%, #7f0000 100%)';
          break;
        case 3:
          document.body.style.background = 'linear-gradient(45deg, #8a2be2 25%, #6a0dad 50%, #4b0082 100%)';
          break;
        case 4:
          document.body.style.background = 'linear-gradient(45deg, #32cd32 25%, #228b22 50%, #006400 100%)';
          break;
        case 5:
          document.body.style.background = 'linear-gradient(45deg, #ff4500 25%, #ff6347 50%, #b22222 100%)';
          break;
        default:
          document.body.style.background = 'linear-gradient(45deg, #00bdbd 25%, #008080 50%,rgb(0, 97, 97) 100%)';
          break;
      }
    }
  }, [color, isClient]);

  if (loading) return <p className={styles.loading}>Loading...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!wins) return null;

  const win = (id: WinId, content: React.ReactNode, minW?: number, minH?: number) => (
    <Window
      key={id}
      title={WIN_TITLES[id]}
      icon={<Icon id={id} size={16} />}
      state={wins[id]}
      active={activeId === id}
      desktop={desk}
      minW={minW ?? WIN_MIN[id][0]}
      minH={minH ?? WIN_MIN[id][1]}
      onChange={(patch) => patchWin(id, patch)}
      onFocus={() => { if (activeId !== id) focusWin(id); }}
      onMinimize={() => minimizeWin(id)}
      onClose={() => closeWin(id)}
    >
      {content}
    </Window>
  );

  return (
    <>
      {showSplash && <Windows98Splash />}
      <div
        className={winStyles.desktop}
        onPointerDown={(e) => { if (e.target === e.currentTarget) { setSelectedIcon(null); setActiveId(null); } }}
      >
        <div className={winStyles.icons} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedIcon(null); }}>
          {WIN_IDS.map((id) => (
            <button
              key={id}
              className={`${winStyles.deskIcon} ${selectedIcon === id ? winStyles.deskIconSelected : ''} ${HIDE_ON_TABLET[id] ? styles.hideOnTablet : ''}`}
              onPointerDown={() => { setSelectedIcon(id); setActiveId(null); }}
              // Mouse: double-click opens. Touch/pen: a single tap opens, like a touch-mode desktop.
              onPointerUp={(e) => { if (e.pointerType !== 'mouse') openWin(id); }}
              onDoubleClick={() => openWin(id)}
              onKeyDown={(e) => { if (e.key === 'Enter') openWin(id); }}
              onFocus={() => setSelectedIcon(id)}
              title={WIN_TITLES[id]}
            >
              <span className={winStyles.deskIconImg}><Icon id={id} /></span>
              <span className={winStyles.deskIconLabel}>{WIN_LABELS[id]}</span>
            </button>
          ))}
        </div>
        {win('info', (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <p><strong>Username:</strong> {userData?.login}</p>
              <p><strong>Name:</strong> {capitalizeWords(userData?.firstName || '') + ' ' + capitalizeWords(userData?.lastName || '')}</p>
              <p><strong>Email:</strong> {userData?.email}</p>
              <p><strong>Audit Ratio:</strong> {userData?.auditRatio}</p>
              <p><strong>Total XP:</strong> {xpAmount / 1000} Kilobytes</p>
              <p><strong>Module Level:</strong> {levelAmount} </p>
              <p><strong>Last Completed:</strong> {lastProject} </p>
            </div>
          </div>
        )) }
        {win('notes', (
          <textarea
            className={styles.textarea}
            style={{ flex: 1, margin: 0, height: 'auto', resize: 'none' }}
            value={notebookContent}
            onChange={handleChange}
            placeholder="Write your notes here..."
          />
        ))}
        {win('audit', userData && (
          <Suspense fallback={<div>Loading chart...</div>}>
            <DynamicGraph GetChart="BarChart" userData={userData} />
          </Suspense>
        ))}
        {win('levels', xpDistribution && levelAmount ? (
          <Suspense fallback={<div>Loading chart...</div>}>
            <DynamicGraph GetChart="XpChart" xpDistribution={xpDistribution} levelAmount={levelAmount} />
          </Suspense>
        ) : null)}
        {win('game', gameData && (
          <Suspense fallback={<div>Loading chart...</div>}>
            <DynamicGraph GetChart="HeatMap" gameData={gameData} />
          </Suspense>
        ))}
        {win('mentors', (() => {
          const tab = auditTab;
          const list = tab === 'mentors' ? mentors : allAuditors;
          const total = list.reduce((n, m) => n + m.count, 0);
          return (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button className={styles.iconButton} style={{ width: 'auto', height: 24, translate: 'none', fontSize: 12, backgroundColor: tab === 'mentors' ? '#888b8d' : '' }} onClick={() => setAuditTab('mentors')}>Mentor audits</button>
                  <button className={styles.iconButton} style={{ width: 'auto', height: 24, translate: 'none', fontSize: 12, backgroundColor: tab === 'all' ? '#888b8d' : '' }} onClick={() => setAuditTab('all')}>All auditors</button>
                </div>
                <p><small>{list.length} auditor{list.length === 1 ? '' : 's'}, {total} completed audit{total === 1 ? '' : 's'} on you</small></p>
                {list.length === 0 ? (
                  <p>No audits found.</p>
                ) : (
                  <ol style={{ paddingLeft: '2em' }}>
                    {list.map((m) => (
                      <li key={m.login}>
                        <strong>{m.login}</strong>{m.role ? ` [${m.role}]` : ''} - {m.count} audit{m.count === 1 ? '' : 's'}, {m.projects} project{m.projects === 1 ? '' : 's'}
                        <br /><small>{monthYear(m.first)} - {monthYear(m.last)}</small>
                        <details>
                          <summary style={{ cursor: 'pointer', fontSize: 11 }}>projects</summary>
                          <ul style={{ margin: '2px 0 6px', paddingLeft: '1.2em', fontSize: 11 }}>
                            {m.audits.map((a, j) => (
                              <li key={j}>{a.date.slice(0, 10)} {a.project}{a.reason ? ` (${a.reason})` : ''}</li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          );
        })())}
        {win('mines', (
          <Suspense fallback={<div>Loading Minesweeper...</div>}>
            <DynamicMinesweeper />
          </Suspense>
        ))}
        {win('color', (
          <div className={styles.colorPicker} style={{ marginTop: 0, justifyContent: 'center' }}>
            {Object.entries(colorMap).map(([id, colorValue]) => (
              <button
                key={id}
                className={styles.colorSquare}
                onClick={() => { setColor(colorValue); saveColor(colorValue); }}
                aria-label={`Change color to ${colorValue}`}
                style={{ backgroundColor: getColorByValue(colorValue) }}
              ></button>
            ))}
          </div>
        ), 240, 100)}
        {win('invaders', (
          <Suspense fallback={<div>Loading Space Invaders...</div>}>
            <DynamicSpaceInvaders saveScore={sendScore} />
          </Suspense>
        ), 320, 300)}
      </div>
      {startOpen && (
        <div className={`${winStyles.startMenu} ${winStyles.raised}`} data-start role="menu">
          <div className={winStyles.startBanner}><span><b>01</b>Displayer</span></div>
          <div className={winStyles.startItems}>
            {WIN_IDS.map((id) => (
              <button
                key={id}
                role="menuitem"
                className={`${winStyles.startItem} ${HIDE_ON_TABLET[id] ? styles.hideOnTablet : ''}`}
                onClick={() => { openWin(id); setStartOpen(false); }}
              >
                <Icon id={id} size={24} />{WIN_LABELS[id]}
              </button>
            ))}
            <div className={winStyles.startDivider} />
            <button role="menuitem" className={winStyles.startItem} onClick={handleLogout}>
              <Icon id="logoff" size={24} />Log Off {userData?.login}...
            </button>
          </div>
        </div>
      )}
      <div className={winStyles.taskbar}>
        <button
          data-start
          className={`${winStyles.raised} ${winStyles.startBtn} ${startOpen ? winStyles.pressed : ''}`}
          onClick={() => setStartOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={startOpen}
        >
          <Icon id="start" size={18} />Start
        </button>
        <div className={winStyles.tbSep} />
        <div className={winStyles.tasks}>
          {tasks.map((id) => (
            <button
              key={id}
              title={WIN_TITLES[id]}
              className={`${winStyles.raised} ${winStyles.taskBtn} ${activeId === id && !wins[id].min ? winStyles.pressed : ''}`}
              onClick={() => onTaskClick(id)}
            >
              <Icon id={id} size={16} />
              <span className={winStyles.taskLabel}>{WIN_LABELS[id]}</span>
            </button>
          ))}
        </div>
        <div className={winStyles.tray}>
          <span>{clock}</span>
        </div>
      </div>
    </>
  );
}
