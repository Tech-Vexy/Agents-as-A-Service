# Voice Agent SaaS

A hot-swappable Voice-Agent-as-a-Service MVP platform built with Next.js 15, TailwindCSS, shadcn/ui, Node.js, TypeScript, and LiveKit.

## Architecture

This project maps each business profile to distinct, individually deployed agent microservices isolated by tenant.
- **Frontend/Backend APIs**: Built with Next.js 15 (App Router).
- **Database**: Hosted Neon PostgreSQL database (via `@neondatabase/serverless`).
- **Voice Agent**: Standalone Node.js process utilizing the standard LiveKit Gemini Realtime API paradigm (`google.beta.realtime.RealtimeModel`). Programmatically locked to a specific `PROFILE_ID` and `LIVEKIT_AGENT_NAME`.
- **CI/CD**: Deploys to Vercel only on GitHub pushes to the `main` branch. Agent deployments to Render background workers are triggered programmatically via the Render REST API from the Next.js user interface.

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

# Render (For programmatic agent deployment)
RENDER_API_KEY=your_render_api_key
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

2. Start the LiveKit standalone voice agent process:

```bash
npx tsx server/agent.ts dev
```

This will run the Voice Agent process connecting to your LiveKit room, waiting for an active connection to test.
