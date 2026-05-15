import { NextResponse } from 'next/server';
import { getActiveProfileId, setActiveProfileId } from '@/lib/store';

export async function GET() {
  const activeId = getActiveProfileId();
  return NextResponse.json({ activeId });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body.activeId) {
      setActiveProfileId(body.activeId);
    }
    return NextResponse.json({ activeId: getActiveProfileId() });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to set active profile' }, { status: 400 });
  }
}
