import { NextResponse } from 'next/server';
import { getActiveProfileId, setActiveProfileId, initializeDatabase } from '@/lib/store';

export async function GET() {
  await initializeDatabase();
  const activeId = await getActiveProfileId();
  return NextResponse.json({ activeId });
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
