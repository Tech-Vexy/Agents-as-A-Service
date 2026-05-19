import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');
  const roomName = profileId ? `room-tenant-${profileId}` : 'voice-agent-room';
  const participantName = searchParams.get('participantName') || 'User';

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'LiveKit API Key and Secret are required' },
      { status: 500 }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    name: participantName,
  });

  at.addGrant({ roomJoin: true, room: roomName });

  try {
    const token = await at.toJwt();

    // Create an explicit dispatch for the targeted universal agent
    if (profileId) {
      const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
      if (livekitUrl) {
         const agentClient = new AgentDispatchClient(livekitUrl, apiKey, apiSecret);
         const targetAgentName = `voice-agent-saas`;
         console.log(`Creating explicit agent dispatch for room ${roomName} targeting agent ${targetAgentName}`);

         // Retry mechanism for triggering the agent worker
         const maxRetries = 3;
         for (let i = 0; i < maxRetries; i++) {
           try {
             // Dispatch needs to be fast; timeout errors indicate network congestion or LiveKit overhead
             await agentClient.createDispatch(roomName, targetAgentName);
             console.log(`Successfully dispatched agent ${targetAgentName} to room ${roomName}`);
             break;
           } catch (dispatchErr) {
             console.warn(`Dispatch attempt ${i + 1} failed for ${targetAgentName}. Still proceeding with token generation...`);
             
             // If this is a timeout/fetch failure, we log but don't block the user from joining
             // The agent worker will usually reconnect/retry on its own if the dispatch was partially received
             if (i === maxRetries - 1) {
               console.error(`Final dispatch attempt failed:`, dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr));
             } else {
               await new Promise(resolve => setTimeout(resolve, 1500)); // Fixed retry interval
             }
           }
         }
      }
    }

    return NextResponse.json({ token });
  } catch (err) {
    console.error('Error generating token:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
