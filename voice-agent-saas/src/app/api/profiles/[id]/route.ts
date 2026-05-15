import { NextResponse } from 'next/server';
import { getProfile, updateProfile, deleteProfile } from '@/lib/store';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseInt((await params).id, 10);
    const body = await request.json();
    const updatedProfile = updateProfile(id, body);
    return NextResponse.json(updatedProfile);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseInt((await params).id, 10);
    deleteProfile(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 400 });
  }
}
