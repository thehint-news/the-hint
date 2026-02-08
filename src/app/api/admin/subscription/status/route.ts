
import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/subscription/queue';

export async function GET(_request: NextRequest): Promise<NextResponse> {
    try {
        const status = queueManager.getStatus();
        return NextResponse.json({
            success: true,
            status,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to retrieve status' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'pause') {
            queueManager.pauseQueue();
            return NextResponse.json({ success: true, message: 'Queue paused' });
        } else if (action === 'resume') {
            queueManager.resumeQueue();
            return NextResponse.json({ success: true, message: 'Queue resumed' });
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use "pause" or "resume".' },
                { status: 400 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );
    }
}
