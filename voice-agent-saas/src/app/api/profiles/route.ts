import { NextResponse } from 'next/server';
import { getAllProfiles, createProfile } from '@/lib/store';

export async function GET() {
  const profiles = getAllProfiles();
  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newProfile = createProfile({
      name: body.name || "New Profile",
      industry: body.industry || "",
      technicalSpecs: body.technicalSpecs || "",
      tone: body.tone || ""
    });
    return NextResponse.json(newProfile);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 400 });
  }
}
