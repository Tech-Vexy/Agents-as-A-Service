import { NextResponse } from 'next/server';
import { getActiveProfileId, setActiveProfileId, initializeDatabase } from '@/lib/store';

export async function GET() {
  try {
    await initializeDatabase();
    const activeId = await getActiveProfileId();
    return NextResponse.json({ activeId });
  } catch (err) {
    console.error("Database initialization failed:", err);
    return NextResponse.json({ activeId: null, error: 'Database connection failed' }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    await initializeDatabase();
    const body = await request.json();
    if (body.activeId) {
      await setActiveProfileId(body.activeId);
    }
    const newActiveId = await getActiveProfileId();
    return NextResponse.json({ activeId: newActiveId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to set active profile' }, { status: 400 });
  }
}
