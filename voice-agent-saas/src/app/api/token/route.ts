import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomName = searchParams.get('roomName') || 'voice-agent-room';
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
    return NextResponse.json({ token });
  } catch (err) {
    console.error('Error generating token:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
