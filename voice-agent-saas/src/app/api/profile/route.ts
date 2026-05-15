import { NextResponse } from 'next/server';
import { getProfile, updateProfile } from '@/lib/store';

export async function GET() {
  const profile = getProfile();
  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updatedProfile = updateProfile(body);
    return NextResponse.json(updatedProfile);
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 400 });
  }
}
