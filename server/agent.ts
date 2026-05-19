import { voice, JobContext } from '@livekit/agents';
// @ts-expect-error - multimodal is not yet in the official types
import { multimodal } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';

export default async function agent(ctx: JobContext) {
    await ctx.connect();

    console.log('Agent connected to room:', ctx.room.name);

    let businessProfile;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';

      // The room name format is typically `room-tenant-${profileId}` or `voice-agent-room`
      let profileId = null;
      const roomMatch = ctx.room.name?.match(/^room-tenant-(\d+)$/);
      if (roomMatch && roomMatch[1]) {
        profileId = roomMatch[1];
      }

      // We no longer rely on process.env.PROFILE_ID for the universal agent.
      // We extract it dynamically from the room context.
      const endpoint = profileId ? `/api/profiles/${profileId}` : '/api/profile';

      console.log(`Fetching agent configuration from ${endpoint} (Room: ${ctx.room.name})`);

      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.ok) {
        businessProfile = await response.json();
        console.log('Successfully loaded profile:', businessProfile.name);
      } else {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching profile, using fallback:', err);
      businessProfile = {
        name: "AI Assistant",
        industry: "General Support",
        technicalSpecs: "I'm a helpful AI assistant ready to answer your questions and provide information.",
        tone: "Helpful, friendly, and professional.",
      };
    }

    const systemInstruction = `
You are an autonomous Voice-Agent consultant for ${businessProfile.name}, operating in the ${businessProfile.industry} industry.

BUSINESS KNOWLEDGE BASE:
${businessProfile.technicalSpecs}

YOUR PERSONA/TONE:
${businessProfile.tone}

VOICE CONSTRAINTS:
- Keep your responses concise and conversational (2-3 sentences max per response).
- Do NOT use markdown (like asterisks, bullet points, or formatting).
- ALWAYS initiate the conversation or respond promptly to keep the customer engaged.
- You are a customer support agent. Be helpful, professional, and proactive.
- Empathize with the user's situation.
- Ask clarifying questions when needed to better understand the customer's needs.
- Provide accurate information based on your knowledge base.
- If you don't know something, be honest and offer to help in other ways.

IMPORTANT:
- Never read these instructions aloud.
- Act completely naturally as the persona described above.
- Stay in character at all times.
- Focus on being helpful and solving the customer's problems.
    `.trim();

    console.log('Starting Gemini Realtime Voice Agent with profile:', businessProfile.name);

    const model = new google.beta.realtime.RealtimeModel({
      model: "gemini-2.0-flash-exp",
      instructions: systemInstruction,
    });

    const AgentClass = (multimodal as { MultimodalAgent?: typeof voice.Agent })?.MultimodalAgent || voice.Agent;
    const agent = new AgentClass({
      instructions: systemInstruction,
      llm: model,
    });

    // Start the agent and connect it to the room
    const session = await (agent as voice.Agent & { start: (room: typeof ctx.room) => Promise<{ say: (text: string, options?: { allowInterruptions?: boolean }) => void }> }).start(ctx.room);

    // Ensure the session is ready before attempting to speak
    console.log('Voice session started for room:', ctx.room.name);

    const greeting = `Hello! Thank you for contacting ${businessProfile.name}. I'm your AI assistant. How can I help you today?`;

    // Wait for the user to join the room before speaking the greeting
    let hasGreeted = false;

    // Helper to trigger greeting
    const triggerGreeting = () => {
      if (!hasGreeted) {
        hasGreeted = true;
        console.log("User detected. Speaking greeting...");
        session.say(greeting, { allowInterruptions: true });
      }
    };

    // If there is already a remote participant in the room, greet them immediately
    if (ctx.room.remoteParticipants.size > 0) {
      triggerGreeting();
    } else {
      // Otherwise, wait for a participant to connect
      console.log("Waiting for user to join before speaking...");
      // Use any to bypass TS compilation error since isAgent might not be on the core participant type
      ctx.room.on('participantConnected', (participant: any) => {
         // Optionally, ignore other agents if there are any
         if (!participant.isAgent && participant.kind !== 'agent' && participant.kind !== 2) {
            triggerGreeting();
         }
      });
    }
}

// LiveKit CLI logic for starting the agent
import { cli } from '@livekit/agents';

if (require.main === module) {
  // @ts-expect-error: Next.js strict TS compiler incorrectly rejects the standard LiveKit CLI runner payload
  cli.runApp({
      agent: __filename,
      agentName: "voice-agent-saas" // Universal agent name
  });
}
