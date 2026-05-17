import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const renderApiKey = process.env.RENDER_API_KEY;
    const renderOwnerId = process.env.RENDER_OWNER_ID;

    if (!renderApiKey || !renderOwnerId) {
      return NextResponse.json({ activeServices: [] });
    }

    const response = await fetch(`https://api.render.com/v1/services?ownerId=${renderOwnerId}&limit=100`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${renderApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch services from Render');
    }

    const services = await response.json();
    
    interface RenderService {
      service: {
        id: string;
        name: string;
        suspended: string;
      };
    }

    // Filter for our voice agents and check if they are not suspended
    const activeServices = (services as RenderService[])
      .filter((s) => s.service.name.startsWith('voice-agent-tenant-') && s.service.suspended === 'not_suspended')
      .map((s) => ({
        id: s.service.id,
        name: s.service.name,
        profileId: parseInt(s.service.name.replace('voice-agent-tenant-', ''), 10),
        status: 'active'
      }));

    return NextResponse.json({ activeServices });
  } catch (err) {
    console.error('Error fetching active agents:', err);
    return NextResponse.json({ activeServices: [] });
  }
}
