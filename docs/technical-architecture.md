# Technical Architecture

## Overview

This project implements an **autonomous AI agent** that maintains a portfolio website. The system uses a sandboxed execution environment to safely run LLM-directed code modifications, build validations, and Git operations.

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

## Core Components

### 1. API Route (`src/app/api/agent/route.ts`)

The entry point for all agent requests. Responsibilities:

- **Request Handling**: Accepts POST requests with task description
- **Sandbox Creation**: Spins up isolated Vercel MicroVM
- **File Injection**: Injects agent code, tools, and goal file
- **Environment Setup**: Passes API keys (OPENAI_API_KEY, GITHUB_TOKEN)
- **Stream Management**: Streams execution output back to client

```typescript
// Key flow
const sandbox = await Sandbox.create();
await sandbox.files.write("goal.txt", task);
await sandbox.files.write("agent/index.js", agentCode);
// ... inject all tools
const process = await sandbox.commands.run("node agent/index.js");
```

### 2. Agent Core (`src/sandbox-files/agent/`)

#### `index.js` - Main Agent Loop
- Reads goal from `goal.txt`
- Initializes tools with project root
- Runs iterative loop (max 15 steps):
  1. Call LLM for next action
  2. Parse response (plan, tool call, or done)
  3. Execute tool and capture result
  4. Add result to conversation context
  5. Repeat until done or error

#### `llm.js` - LLM Integration
- Wraps OpenAI API calls
- Contains system prompt with:
  - Portfolio skill (embedded knowledge)
  - Tool schemas
  - Workflow guidelines
  - Error handling rules
- Handles rate limiting with exponential backoff
- Formats tool results for context

#### `state.js` - State Management
- Tracks execution state:
  - `goal`: Current task
  - `plan`: Planned steps
  - `changed_files`: Modified files
  - `build`: Build status and errors
  - `git`: Commit/push status
  - `iteration`: Step count and repairs

### 3. Tools Layer (`src/sandbox-files/tools/`)

#### `filesystem.js`
- `write_file(path, content)`: Safe file writing
- `read_file(path)`: File reading with size limits
- `list_files(dir)`: Directory listing
- `search_files(query, path)`: Content search

#### `git.js`
- `git_clone(url, targetDir)`: Repository cloning
- `git_status()`: Status checking
- `git_add(files)`: Staging changes
- `git_commit(message)`: Committing with proper author
- `git_push(branch)`: Token-authenticated push
- `git_diff()` / `git_log()`: History inspection

#### `build.js`
- `npm_install()`: Optimized dependency installation
- `run_build()`: Build with telemetry disabled
- `run_lint()`: Linting execution
- `check_build_output()`: Build artifact verification

#### `command.js`
- `run_command(cmd, args)`: Whitelisted command execution
- Security: Blocks dangerous commands (rm, curl, sudo, etc.)

#### `browser.js`
- `verify_url(url)`: Lightweight HTTP verification
- No Puppeteer dependency (removed for speed)

### 4. LLM Communication Protocol

The agent communicates with GPT-4o using a structured JSON protocol:

```json
// Plan response
{"plan": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]}

// Tool call
{"tool": "write_file", "args": {"path": "src/file.ts", "content": "..."}}

// Completion
{"done": true, "result": "Task completed successfully"}
```

## Data Flow

```
1. User Request
   └─> POST /api/agent {"task": "Add footer text"}

2. Sandbox Initialization
   └─> Create MicroVM
   └─> Inject agent files
   └─> Set environment variables

3. Agent Execution
   └─> Clone repository
   └─> npm install
   └─> LLM Loop:
       ├─> LLM: "Backup state"
       ├─> Tool: git_stash_backup()
       ├─> LLM: "Read footer file"
       ├─> Tool: read_file("src/components/Footer.tsx")
       ├─> LLM: "Write updated footer"
       ├─> Tool: write_file("src/components/Footer.tsx", "...")
       ├─> LLM: "Run build"
       ├─> Tool: run_build()
       ├─> [If fail] Tool: git_restore_backup(), retry
       ├─> [If pass] Tool: git_clear_backup()
       ├─> LLM: "Commit and push to feature branch"
       ├─> Tool: git_add("."), git_commit("...")
       ├─> Tool: git_push("main") → pushes to agent/changes-{timestamp}
       ├─> LLM: "Create pull request"
       ├─> Tool: git_create_pr("Update footer", "...")
       └─> LLM: {"done": true, "result": "PR created at ..."}

4. Response
   └─> Stream output to client
   └─> Human reviews PR
   └─> Merge triggers Vercel deployment
```

## Security Model

### Sandbox Isolation
- **MicroVM**: Each request runs in isolated environment
- **No persistent state**: Sandbox destroyed after execution
- **Limited network**: Can only reach whitelisted services

### Git Safety
- **No direct main push**: All changes go to feature branches
- **PR-based workflow**: Human review required before merge
- **Backup/Restore**: git stash before changes, rollback on failure

### Path Sanitization
- **Null byte protection**: Blocks poison null byte attacks
- **Traversal prevention**: Validates all paths stay within project root
- **Pattern blocking**: Rejects suspicious patterns (../, ~, ${}, etc.)

### Command Restrictions
```javascript
const ALLOWED = ["node", "npm", "npx", "git", "ls", "cat", "grep", "echo", "pwd"];
const BLOCKED = ["rm", "curl", "wget", "sudo", "ssh", "kill", "chmod", "chown"];
```

### Token Security
- `OPENAI_API_KEY`: Passed as environment variable, never logged
- `GITHUB_TOKEN`: Used only for authenticated push and PR creation, scoped to repository

## Performance Optimizations

| Optimization | Impact |
|-------------|--------|
| `npm ci --no-audit --no-fund --prefer-offline` | ~20s faster installs |
| `NEXT_TELEMETRY_DISABLED=1` | ~5s faster builds |
| Removed Puppeteer | ~40s faster (no browser install) |
| Build-only verification | ~15s faster (no dev server) |
| Embedded portfolio skill | Fewer LLM calls needed |

## Deployment Architecture

```
GitHub Push
    │
    ▼
┌─────────────────┐
│  GitHub Repo    │
│ cinema-portfolio│
└────────┬────────┘
         │ webhook
         ▼
┌─────────────────┐
│     Vercel      │
│  Auto-Deploy    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Production     │
│ ashwinramesh    │
│ kannan.com      │
└─────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Next.js 16 + React 19 |
| Sandbox | @vercel/sandbox (MicroVM) |
| LLM | OpenAI GPT-4o |
| Version Control | Git + GitHub |
| Deployment | Vercel |
| Language | TypeScript (API) + JavaScript (Agent) |
