import { NextResponse } from 'next/server';
import { getProfile, updateProfile, deleteProfile, initializeDatabase } from '@/lib/store';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const id = parseInt((await params).id, 10);
    const profile = await getProfile(id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const id = parseInt((await params).id, 10);
    const body = await request.json();
    const updatedProfile = await updateProfile(id, {
      name: body.name,
      industry: body.industry,
      technicalSpecs: body.technicalSpecs,
      tone: body.tone,
      avatar_url: body.avatar_url
    });
    return NextResponse.json(updatedProfile);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initializeDatabase();
    const id = parseInt((await params).id, 10);
    await deleteProfile(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 400 });
  }
}
