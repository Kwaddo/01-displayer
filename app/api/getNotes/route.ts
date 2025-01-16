// app/api/getNotes/route.ts
import { NextResponse } from 'next/server';
import db from '@/utils/db'; // Import the database instance

// Define the User type
interface User {
  id: number;
  user_id: string;
  token: string;
  notebookcontent: string | null;  // Nullable field
  color_id: number | null;
}

export async function GET(request: Request) {
  const token = request.headers.get('Authorization');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the user from the database based on the token
  const user = db.prepare('SELECT * FROM users WHERE token = ?').get(token) as User | undefined;  // Explicitly type the result

  console.log(user);  // Check the structure of the user object in the console

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Now TypeScript knows that 'user' has a 'notebookcontent' property
  return NextResponse.json({ notebookcontent: user.notebookcontent || '' });
}
