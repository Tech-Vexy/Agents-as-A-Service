import { NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/store';

// This is the endpoint the Voice Agent Backend hits to retrieve the currently active brain context
export async function GET() {
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: 'No active profile found' }, { status: 404 });
  }
  return NextResponse.json(profile);
}
