import { NextResponse } from 'next/server';
import { getUserByUserID } from '@/utils/db';

export async function GET(request: Request) {
    try {
        const userID = request.headers.get('Authorization');
        if (!userID) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await getUserByUserID(userID);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const siscore = user.SIscore || '';
        return NextResponse.json({ si_score: siscore });
    } catch (error) {
        console.error('Error fetching score:', error);
        return NextResponse.json({ error: 'Failed to fetch score' }, { status: 500 });
    }
}
