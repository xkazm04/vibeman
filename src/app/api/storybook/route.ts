import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        // Simple availability check
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000);

        await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });

        clearTimeout(id);
        return NextResponse.json({ available: true });
    } catch (error) {
        return NextResponse.json({ available: false });
    }
}
