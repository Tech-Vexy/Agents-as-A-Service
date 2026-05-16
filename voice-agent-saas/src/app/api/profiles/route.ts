import { NextResponse } from 'next/server';
import { getAllProfiles, createProfile, initializeDatabase } from '@/lib/store';

export async function GET() {
  await initializeDatabase();
  const profiles = await getAllProfiles();
  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  try {
    await initializeDatabase();
    const body = await request.json();
    const newProfile = await createProfile({
      name: body.name || "New Profile",
      industry: body.industry || "",
      technicalSpecs: body.technicalSpecs || "",
      tone: body.tone || "",
      avatar_url: body.avatar_url || ""
    });
    return NextResponse.json(newProfile);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 400 });
  }
}
