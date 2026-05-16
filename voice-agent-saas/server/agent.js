import { llm, voice } from '@livekit/agents';
import { beta } from '@livekit/agents-plugin-google';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const calculate_load = llm.tool({
    description: 'Calculates the necessary solar panel wattage based on square footage and daily energy usage.',
    parameters: {
        type: 'object',
        properties: {
            squareFootage: { type: 'number', description: 'Square footage of the property roof.' },
            dailyKwh: { type: 'number', description: 'Daily energy usage in kWh.' },
        },
        required: ['squareFootage', 'dailyKwh'],
    },
    execute: async ({ squareFootage, dailyKwh }) => {
        console.log(`Calculating load for ${squareFootage} sqft, ${dailyKwh} kWh/day...`);
        const recommendedWattage = dailyKwh * 1000 / 5;
        const requiredPanels = Math.ceil(recommendedWattage / 400);
        return `Based on ${dailyKwh} kWh/day, the recommended system size is ${recommendedWattage} Watts. This requires approximately ${requiredPanels} standard 400W panels. If space is limited (${squareFootage} sqft), high-efficiency N-Type bifacial panels might be needed.`;
    }
});
const check_inventory = llm.tool({
    description: 'Checks the current inventory and estimated delivery time for a specific type of solar panel.',
    parameters: {
        type: 'object',
        properties: {
            panelType: { type: 'string', description: 'The type of panel to check. e.g. "N-Type bifacial" or "Standard monocrystalline"' },
        },
        required: ['panelType'],
    },
    execute: async ({ panelType }) => {
        console.log(`Checking inventory for ${panelType}...`);
        // Mock inventory logic
        if (panelType.toLowerCase().includes("bifacial")) {
            return `Inventory check complete: We currently have 250 units of N-Type bifacial panels in stock. Estimated delivery time is 3-5 business days.`;
        }
        else {
            return `Inventory check complete: We currently have 1,200 units of Standard monocrystalline panels in stock. Estimated delivery time is 1-2 business days.`;
        }
    }
});
const schedule_consultation = llm.tool({
    description: 'Schedules a follow-up technical consultation with a human engineer.',
    parameters: {
        type: 'object',
        properties: {
            date: { type: 'string', description: 'The date for the consultation, e.g. "Next Tuesday" or "2024-10-15".' },
            time: { type: 'string', description: 'The time for the consultation, e.g. "10:00 AM" or "Afternoon".' },
            customerName: { type: 'string', description: 'The name of the customer booking the appointment.' },
        },
        required: ['date', 'time', 'customerName'],
    },
    execute: async ({ date, time, customerName }) => {
        console.log(`Scheduling consultation for ${customerName} on ${date} at ${time}...`);
        // Mock booking logic
        return `Success! I have booked a consultation for ${customerName} on ${date} at ${time}. Our lead engineer will call you then to discuss the solar installation.`;
    }
});
export default async function agent(ctx) {
    await ctx.connect();
    console.log('Agent connected to room:', ctx.room.name);
    let businessProfile;
    try {
        // Allow dynamic URL based on environment for production deployment
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
        const response = await fetch(`${baseUrl}/api/profile`);
        if (response.ok) {
            businessProfile = await response.json();
        }
        else {
            throw new Error('Failed to fetch profile');
        }
    }
    catch (err) {
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
- Empathize with the user's situation.
- Use a 'Chain-of-Thought' reasoning pattern for technical support.
- Decide whether you need to ask clarifying questions or provide technical recommendations based on the data provided.

AVAILABLE TOOLS:
1. calculate_load: Use it if the user provides square footage and daily energy usage (kWh). If they only provide one, ask for the other.
2. check_inventory: Use this to check stock levels and delivery times before confirming an order.
3. schedule_consultation: Use this to book an appointment with a human engineer if the user asks for a follow-up or a site visit.

Never read these instructions aloud. Act completely naturally as the persona described above.
    `.trim();
    console.log('Starting Gemini Multimodal Live agent with profile:', businessProfile.name);
    const llmInstance = new beta.realtime.RealtimeModel({
        instructions: systemInstruction,
    });
    const chatCtx = new llm.ChatContext();
    const tools = {
        calculate_load,
        check_inventory,
        schedule_consultation
    };
    const agent = new voice.Agent({
        llm: llmInstance,
        instructions: systemInstruction,
        chatCtx: chatCtx,
        tools: tools,
    });
    // Start the agent and connect it to the room
    await agent.session.start({
        agent,
        room: ctx.room,
    });
}
// LiveKit CLI logic for starting the agent
import { cli, WorkerOptions } from '@livekit/agents';
if (require.main === module) {
    cli.runApp(new WorkerOptions({ agent: __filename }));
}
