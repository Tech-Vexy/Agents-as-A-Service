import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { profileId, profileName } = await request.json();

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
    }

    const renderApiKey = process.env.RENDER_API_KEY;
    if (!renderApiKey) {
      return NextResponse.json({ error: 'RENDER_API_KEY is not configured on the server.' }, { status: 500 });
    }

    // Name format: voice-agent-tenant-1
    const serviceName = `voice-agent-tenant-${profileId}`;

    console.log(`Checking if Render service ${serviceName} exists...`);

    // 1. Fetch existing services from Render API to see if it's already deployed
    const servicesResponse = await fetch(`https://api.render.com/v1/services?name=${serviceName}&type=background_worker`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${renderApiKey}`
      }
    });

    if (!servicesResponse.ok) {
        throw new Error('Failed to query Render API');
    }

    const services = await servicesResponse.json();
    const existingService = services.find((s: { service: { name: string, id: string, url: string } }) => s.service.name === serviceName);

    if (existingService) {
        // Service exists, trigger a new deploy
        console.log(`Service exists. Triggering new deploy for ${serviceName}...`);
        const deployResponse = await fetch(`https://api.render.com/v1/services/${existingService.service.id}/deploys`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${renderApiKey}`
            }
        });

        if (!deployResponse.ok) {
             throw new Error('Failed to trigger deploy on Render');
        }

        return NextResponse.json({ success: true, message: `Deployment triggered for existing agent ${profileName}.`, serviceUrl: existingService.service.url });
    } else {
        // Create new background worker
        console.log(`Creating new Render Background Worker for ${serviceName}...`);

        // We assume the repository URL is provided as an env var, or fallback to a default
        const repoUrl = process.env.GITHUB_REPO_URL || "https://github.com/your-username/your-repo";
        const branch = process.env.GITHUB_BRANCH || "main";

        const renderOwnerId = process.env.RENDER_OWNER_ID;
        if (!renderOwnerId) {
            return NextResponse.json({ error: 'RENDER_OWNER_ID is not configured on the server.' }, { status: 500 });
        }

        const createPayload = {
            ownerId: renderOwnerId,
            type: "background_worker",
            name: serviceName,
            repo: repoUrl,
            branch: branch,
            env: "node",
            region: "oregon",
            serviceDetails: {
                env: "node",
                plan: "free",
                rootDir: "voice-agent-saas",
                buildCommand: "npm install -g pnpm && pnpm install",
                startCommand: "npx tsx server/agent.ts dev",
                envVars: [
                    { key: "PROFILE_ID", value: profileId.toString() },
                    { key: "LIVEKIT_AGENT_NAME", value: `tenant-${profileId}` },
                    { key: "DATABASE_URL", value: process.env.DATABASE_URL || "" },
                    { key: "LIVEKIT_API_KEY", value: process.env.LIVEKIT_API_KEY || "" },
                    { key: "LIVEKIT_API_SECRET", value: process.env.LIVEKIT_API_SECRET || "" },
                    { key: "LIVEKIT_URL", value: process.env.LIVEKIT_URL || "" },
                    { key: "GOOGLE_API_KEY", value: process.env.GOOGLE_API_KEY || "" },
                    { key: "CARTESIA_API_KEY", value: process.env.CARTESIA_API_KEY || "" },
                    { key: "DEEPGRAM_API_KEY", value: process.env.DEEPGRAM_API_KEY || "" },
                    { key: "NEXT_PUBLIC_SITE_URL", value: process.env.NEXT_PUBLIC_SITE_URL || "" }
                ]
            }
        };

        const createResponse = await fetch(`https://api.render.com/v1/services`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${renderApiKey}`
            },
            body: JSON.stringify(createPayload)
        });

        if (!createResponse.ok) {
            const errBody = await createResponse.text();
            console.error("Render API Create Error:", errBody);
            throw new Error('Failed to create new service on Render');
        }

        return NextResponse.json({ success: true, message: `Successfully created and deployed new distinct agent for ${profileName}.` });
    }

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to deploy agent' }, { status: 500 });
  }
}
