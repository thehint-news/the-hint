
import { NextResponse } from 'next/server';
import { refreshSession } from '@/lib/auth/session';

export async function POST() {
    try {
        await refreshSession();
        return NextResponse.json({ success: true, message: 'Session extended' });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Session expired or invalid' },
            { status: 401 }
        );
    }
}
