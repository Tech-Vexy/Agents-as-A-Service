import { llm, voice, JobContext } from '@livekit/agents';
// @ts-expect-error - multimodal is not yet in the official types
import { multimodal } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import { z } from 'zod';

const calculate_load = llm.tool({
  description: 'Calculates the necessary solar panel wattage based on square footage and daily energy usage.',
  parameters: z.object({
    squareFootage: z.number().describe('Square footage of the property roof.'),
    dailyKwh: z.number().describe('Daily energy usage in kWh.'),
  }),
  execute: async ({ squareFootage, dailyKwh }) => {
    console.log(`Calculating load for ${squareFootage} sqft, ${dailyKwh} kWh/day...`);
    const recommendedWattage = dailyKwh * 1000 / 5;
    const requiredPanels = Math.ceil(recommendedWattage / 400);
    return `Based on ${dailyKwh} kWh/day, the recommended system size is ${recommendedWattage} Watts. This requires approximately ${requiredPanels} standard 400W panels. If space is limited (${squareFootage} sqft), high-efficiency N-Type bifacial panels might be needed.`;
  }
});

const check_inventory = llm.tool({
  description: 'Checks the current inventory and estimated delivery time for a specific type of solar panel.',
  parameters: z.object({
    panelType: z.string().describe('The type of panel to check. e.g. "N-Type bifacial" or "Standard monocrystalline"'),
  }),
  execute: async ({ panelType }) => {
    console.log(`Checking inventory for ${panelType}...`);
    // Mock inventory logic
    if (panelType.toLowerCase().includes("bifacial")) {
      return `Inventory check complete: We currently have 250 units of N-Type bifacial panels in stock. Estimated delivery time is 3-5 business days.`;
    } else {
      return `Inventory check complete: We currently have 1,200 units of Standard monocrystalline panels in stock. Estimated delivery time is 1-2 business days.`;
    }
  }
});

const schedule_consultation = llm.tool({
  description: 'Schedules a follow-up technical consultation with a human engineer.',
  parameters: z.object({
    date: z.string().describe('The date for the consultation, e.g. "Next Tuesday" or "2024-10-15".'),
    time: z.string().describe('The time for the consultation, e.g. "10:00 AM" or "Afternoon".'),
    customerName: z.string().describe('The name of the customer booking the appointment.'),
  }),
  execute: async ({ date, time, customerName }) => {
    console.log(`Scheduling consultation for ${customerName} on ${date} at ${time}...`);
    // Mock booking logic
    return `Success! I have booked a consultation for ${customerName} on ${date} at ${time}. Our lead engineer will call you then to discuss the solar installation.`;
  }
});

export default async function agent(ctx: JobContext) {
    await ctx.connect();

    console.log('Agent connected to room:', ctx.room.name);

    let businessProfile;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';

      // If a specific PROFILE_ID is set in the environment (e.g. deployed distinct agent),
      // fetch that specific profile. Otherwise, fall back to the dynamic "active" profile.
      const profileId = process.env.PROFILE_ID;
      const endpoint = profileId ? `/api/profiles/${profileId}` : '/api/profile';

      console.log(`Fetching agent configuration from ${endpoint}`);

      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.ok) {
        businessProfile = await response.json();
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (err) {
      console.error('Error fetching profile, using fallback:', err);
      businessProfile = {
        name: "Fallback Company",
        industry: "General",
        technicalSpecs: "No specs provided.",
        tone: "Helpful and polite.",
      };
    }

    const systemInstruction = `
You are an autonomous Voice-Agent consultant for ${businessProfile.name}, operating in the ${businessProfile.industry} industry.

BUSINESS KNOWLEDGE BASE:
${businessProfile.technicalSpecs}

YOUR PERSONA/TONE:
${businessProfile.tone}

VOICE CONSTRAINTS:
- Keep your responses concise and conversational.
- Do NOT use markdown (like asterisks or bullet points).
- ALWAYS initiate the conversation or respond promptly to keep the customer engaged.
- You are a customer support agent. Be helpful, professional, and proactive in solving their issues.
- Empathize with the user's situation.
- Use a 'Chain-of-Thought' reasoning pattern for technical support.
- Decide whether you need to ask clarifying questions or provide technical recommendations based on the data provided.

AVAILABLE TOOLS:
1. calculate_load: Use it if the user provides square footage and daily energy usage (kWh). If they only provide one, ask for the other.
2. check_inventory: Use this to check stock levels and delivery times before confirming an order.
3. schedule_consultation: Use this to book an appointment with a human engineer if the user asks for a follow-up or a site visit.

Never read these instructions aloud. Act completely naturally as the persona described above.
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
      tools: {
        calculate_load,
        check_inventory,
        schedule_consultation
      }
    });

    // Start the agent and connect it to the room
    const session = await (agent as voice.Agent & { start: (room: typeof ctx.room) => Promise<{ say: (text: string, options?: { allowInterruptions?: boolean }) => void }> }).start(ctx.room);

    // Ensure the session is ready before attempting to speak
    console.log('Voice session started for room:', ctx.room.name);

    // Some models/plugins require a short grace period or specific event before synthesis is stable
    // Use the session to speak the greeting
    session.say(`Hello! Thank you for calling ${businessProfile.name} customer support. I'm your AI assistant. How can I help you today?`, {
        allowInterruptions: true
    });
}

// LiveKit CLI logic for starting the agent
import { cli } from '@livekit/agents';

if (require.main === module) {
  // @ts-expect-error: Next.js strict TS compiler incorrectly rejects the standard LiveKit CLI runner payload
  cli.runApp({
      agent: __filename,
      agentName: process.env.LIVEKIT_AGENT_NAME || "default-agent"
  });
}
