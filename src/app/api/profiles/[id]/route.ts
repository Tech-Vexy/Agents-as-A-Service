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
    const renderApiKey = process.env.RENDER_API_KEY;
    const serviceName = `voice-agent-tenant-${id}`;

    // 1. Delete from Render if API Key exists
    if (renderApiKey) {
      try {
        console.log(`Searching for Render service to delete: ${serviceName}`);
        const servicesResponse = await fetch(`https://api.render.com/v1/services?name=${serviceName}&type=web_service`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${renderApiKey}`
          }
        });

        if (servicesResponse.ok) {
          const services = await servicesResponse.json();
          const existingService = services.find((s: { service: { name: string, id: string } }) => s.service.name === serviceName);
          
          if (existingService) {
            console.log(`Deleting Render service: ${existingService.service.id}`);
            await fetch(`https://api.render.com/v1/services/${existingService.service.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${renderApiKey}`
              }
            });
          }
        }
      } catch (renderErr) {
        console.error('Failed to cleanup Render service during profile deletion:', renderErr);
        // We continue so the database entry is still deleted even if Render fails
      }
    }

    // 2. Delete from database
    await deleteProfile(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 400 });
  }
}
