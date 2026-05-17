import { NextResponse } from 'next/server';
import { getActiveProfileId, setActiveProfileId } from '@/lib/store';

export async function GET() {
  try {
    const activeId = await getActiveProfileId();
    return NextResponse.json({ activeId });
  } catch (err) {
    console.error("Query failed:", err);
    return NextResponse.json({ activeId: null, error: 'Query failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
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
