# Voice Agent SaaS

A hot-swappable Voice-Agent-as-a-Service MVP platform built with Next.js 15, TailwindCSS, shadcn/ui, Node.js, TypeScript, and LiveKit.

## Architecture

This project uses a single, universal agent architecture. A single LiveKit worker dynamically fetches and applies the correct business profile from the database based on the incoming room context.
- **Frontend/Backend APIs**: Built with Next.js 15 (App Router).
- **Database**: Hosted Neon PostgreSQL database (via `@neondatabase/serverless`).
- **Voice Agent**: A universal, standalone Node.js process utilizing the standard LiveKit Gemini Realtime API paradigm (`google.beta.realtime.RealtimeModel`). It dynamically extracts the `profileId` from the LiveKit room name to serve the correct prompt and knowledge base.
- **CI/CD**: The Next.js frontend deploys to Vercel. The universal Voice Agent backend runs as a single service, which is deployed directly to LiveKit Cloud using their managed agents infrastructure.

## Setup Instructions

### Prerequisites

- Node.js 20+
- `pnpm` package manager
- LiveKit Cloud account / credentials
- API Keys for Google (Gemini)
- Neon Database URL

### Environment Variables

Create a `.env.local` file in the root directory and configure the following variables:

```env
# Next.js Server
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud

# Agent Plugins
GOOGLE_API_KEY=your_google_gemini_api_key

# Database
DATABASE_URL=your_neon_postgres_url

```

### Installation

Install dependencies using `pnpm`:

```bash
pnpm install
```

### Running Locally

1. Start the Next.js development server:

```bash
pnpm run dev
```

2. Start the LiveKit universal voice agent process:

```bash
npx tsx server/agent.ts dev
```

This will run the universal Voice Agent worker, connecting to your LiveKit room, waiting to dynamically serve any active connection.

### Deploying the Universal Agent

Instead of deploying a separate worker for every single profile, you only need to deploy the universal agent **once** to LiveKit Cloud.

To deploy the agent directly to LiveKit Cloud using the LiveKit CLI:

1. Ensure you have the [LiveKit CLI installed](https://docs.livekit.io/agents/quickstart/#install-the-livekit-cli).
2. Authenticate the CLI with your project (if you haven't already):
   ```bash
   lk project authenticate
   ```
3. Deploy the agent worker to LiveKit Cloud:
   ```bash
   lk app deploy --env DATABASE_URL=your_db_url --env GOOGLE_API_KEY=your_google_key --env NEXT_PUBLIC_SITE_URL=https://your-frontend-url.com
   ```
4. The universal agent will now constantly run on LiveKit's infrastructure and handle all profile sessions dynamically based on the room context.
