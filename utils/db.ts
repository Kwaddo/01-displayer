import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

// Dilmune storage (S3-compatible) replaces the old Postgres `users` table.
// One JSON object per user: users/<id>.json, plus leaderboard.json with the top scores.

export interface UserRecord {
  notebookcontent: string;
  color_id: number;
  siscore: number;
}

export interface TopScore {
  user_id: string;
  SIscore: number;
}

const BUCKET = process.env.S3_BUCKET || 'displayer-data';
const LEADERBOARD_KEY = 'leaderboard.json';
const LEADERBOARD_SIZE = 20;

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

function userKey(userID: string): string {
  if (!userID || userID.length > 64) throw new Error('Invalid user id');
  return `users/${encodeURIComponent(userID)}.json`;
}

async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await res.Body!.transformToString();
    return JSON.parse(text) as T;
  } catch (error: any) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

async function putJSON(key: string, value: unknown): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(value),
      ContentType: 'application/json',
    })
  );
}

export async function checkStorage(): Promise<void> {
  await s3().send(new HeadBucketCommand({ Bucket: BUCKET }));
}

export async function getUserByUserID(userID: string): Promise<UserRecord | null> {
  return getJSON<UserRecord>(userKey(userID));
}

/** Create the user record if it does not exist yet. Returns true when created. */
export async function createUserIfMissing(userID: string): Promise<boolean> {
  if (await getUserByUserID(userID)) return false;
  await putJSON(userKey(userID), { notebookcontent: '', color_id: 1, siscore: 0 } satisfies UserRecord);
  return true;
}

/** Merge a patch into an existing user. Returns false when the user does not exist. */
export async function updateUser(userID: string, patch: Partial<UserRecord>): Promise<boolean> {
  const user = await getUserByUserID(userID);
  if (!user) return false;
  await putJSON(userKey(userID), { ...user, ...patch });
  return true;
}

export async function getTopScores(limit = 5): Promise<TopScore[]> {
  const board = (await getJSON<TopScore[]>(LEADERBOARD_KEY)) || [];
  return board.slice(0, limit);
}

export async function recordScore(userID: string, siscore: number): Promise<boolean> {
  const ok = await updateUser(userID, { siscore });
  if (!ok) return false;
  const board = (await getJSON<TopScore[]>(LEADERBOARD_KEY)) || [];
  const next = board.filter((e) => e.user_id !== userID);
  next.push({ user_id: userID, SIscore: siscore });
  next.sort((a, b) => b.SIscore - a.SIscore);
  await putJSON(LEADERBOARD_KEY, next.slice(0, LEADERBOARD_SIZE));
  return true;
}
