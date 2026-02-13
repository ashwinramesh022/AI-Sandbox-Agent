# Sandbox Coding Agent

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                    POST /api/agent { task }                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTE                           │
│                   src/app/api/agent/route.ts                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Receives task from client                                │ │
│  │ • Creates Vercel Sandbox (MicroVM)                         │ │
│  │ • Injects agent files + environment variables              │ │
│  │ • Executes: node agent/index.js                            │ │
│  │ • Streams output back to client                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL SANDBOX (MicroVM)                     │
│              Isolated execution environment                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      AGENT LOOP                            │ │
│  │                  agent/index.js                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ 1. Read goal.txt (injected task)                     │  │ │
│  │  │ 2. Call LLM for next action                          │  │ │
│  │  │ 3. Execute tool (filesystem, git, build)             │  │ │
│  │  │ 4. Loop until done or max steps                      │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      TOOLS LAYER                           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│  │  │filesystem│ │   git    │ │  build   │ │ command  │      │ │
│  │  │  .js     │ │   .js    │ │   .js    │ │   .js    │      │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               CLONED REPOSITORY                            │ │
│  │            cinema-portfolio (Next.js)                       │ │
│  │  • Makes file changes                                      │ │
│  │  • Runs npm install & build                                │ │
│  │  • Commits and pushes to GitHub                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  OpenAI API  │  │    GitHub    │  │    Vercel    │          │
│  │   (GPT-4o)   │  │  Repository  │  │  Deployment  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Prerequisites

- Node.js 22+
- Vercel account with Sandbox access
- OpenAI API key (for Layer 4+)

### Installation

```bash
npm install
```

### Authentication

**Option 1: Vercel OIDC (Recommended)**

```bash
vercel link
vercel env pull
```

**Option 2: Manual Token**

Create `.env.local`:

```env
VERCEL_TOKEN=your_access_token
VERCEL_TEAM_ID=your_team_id
VERCEL_PROJECT_ID=your_project_id
```

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Key Architectural Decisions

### Why the agent runs inside the sandbox

1. **Security**: Agent is untrusted compute. It should not have access to host resources.
2. **Isolation**: All file writes, reads, and command execution are contained.
3. **Clean boundaries**: Host only manages lifecycle; sandbox runs all logic.
4. **Auditability**: Everything the agent does is visible in stdout.

### Why streaming matters

1. **Real-time visibility**: See what's happening as it happens.
2. **Debug-friendly**: Each step is logged before execution.
3. **No buffering surprises**: Output is flushed immediately.

### Why strict JSON

1. **Parseable**: No need to extract tool calls from prose.
2. **Validated**: Fail fast on malformed responses.
3. **Deterministic**: Same structure every time.

## Security Model

- Sandbox runs as `vercel-sandbox` user (not root)
- Working directory: `/vercel/sandbox`
- Timeout: 5 minutes default, configurable
- Network: Can make outbound calls (for OpenAI API)
- No persistent storage after destruction
- No access to host filesystem

