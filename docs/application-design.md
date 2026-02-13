# Application Code Design

## Overview

This document describes the code organization, design patterns, and implementation details of the Portfolio Maintenance Agent.

## Project Structure

```
Questom-Assignment/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agent/
│   │   │       └── route.ts       # API endpoint
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page (UI)
│   └── sandbox-files/             # Files injected into sandbox
│       ├── agent/
│       │   ├── index.js           # Main agent loop
│       │   ├── llm.js             # LLM integration
│       │   └── state.js           # State management
│       └── tools/
│           ├── index.js           # Tool registry
│           ├── filesystem.js      # File operations
│           ├── git.js             # Git operations
│           ├── build.js           # Build operations
│           ├── command.js         # Shell commands
│           └── browser.js         # URL verification
├── docs/                          # Documentation
├── document.md                    # Portfolio skill file
├── package.json
└── next.config.mjs
```

## Design Patterns

### 1. Agent Loop Pattern

The core of the system follows an **Agent Loop** pattern - an iterative cycle of reasoning and action:

```javascript
// Simplified agent loop (agent/index.js)
while (step < MAX_STEPS && !done) {
  // 1. Reason: Ask LLM for next action
  const action = await llm.callLLM(apiKey, messages);
  
  // 2. Act: Execute the action
  if (action.tool) {
    const result = await executeTool(action.tool, action.args);
    messages.push(formatResult(result));
  }
  
  // 3. Check: Is task complete?
  if (action.done) {
    done = true;
    finalResult = action.result;
  }
  
  step++;
}
```

### 2. Tool Registry Pattern

Tools are organized as a registry with a consistent interface:

```javascript
// tools/index.js
function getAllTools() {
  return {
    // Each tool is a function: (args) => { success, data, error }
    write_file: filesystem.write_file,
    read_file: filesystem.read_file,
    git_commit: git.git_commit,
    npm_install: build.npm_install,
    // ...
  };
}
```

**Benefits:**
- Easy to add/remove tools
- Consistent return format
- Centralized initialization

### 3. State Machine Pattern

Execution state is managed as an immutable-style state object:

```javascript
// state.js - Internal state structure
const state = {
  goal: null,
  plan: [],
  changed_files: [],
  build: {
    success: null,
    errors: [],
    output: null
  },
  verification: {
    success: null,
    checks: []
  },
  git: {
    committed: false,
    pushed: false,
    commit_hash: null
  },
  iteration: {
    count: 0,
    errors: [],
    repairs: 0
  }
};

// State updates through setter functions
function setBuildStatus(success, errors, output) {
  state.build = { success, errors, output };
}
```

### 4. Sandbox Injection Pattern

Files are injected into the sandbox rather than executed directly:

```typescript
// route.ts
const AGENT_FILES = {
  "agent/index.js": agentIndexCode,
  "agent/llm.js": llmCode,
  "tools/filesystem.js": filesystemCode,
  // ...
};

for (const [path, content] of Object.entries(AGENT_FILES)) {
  await sandbox.files.write(path, content);
}
```

**Benefits:**
- Complete isolation
- No file system access to host
- Reproducible environment

### 5. Streaming Response Pattern

The API uses Next.js streaming for real-time output:

```typescript
// route.ts
return new Response(
  new ReadableStream({
    async start(controller) {
      // Stream sandbox output
      process.output.pipeTo(new WritableStream({
        write(chunk) {
          controller.enqueue(encoder.encode(chunk));
        }
      }));
    }
  }),
  { headers: { "Content-Type": "text/plain; charset=utf-8" } }
);
```

## Code Organization Principles

### Separation of Concerns

| Layer | Responsibility | Files |
|-------|---------------|-------|
| **API** | Request handling, sandbox creation | `route.ts` |
| **Agent** | Goal parsing, LLM orchestration | `agent/index.js` |
| **LLM** | API calls, prompt engineering | `agent/llm.js` |
| **State** | Execution tracking | `agent/state.js` |
| **Tools** | Atomic operations | `tools/*.js` |

### Tool Interface Contract

Every tool follows this contract:

```javascript
/**
 * @param {Object} args - Tool-specific arguments
 * @returns {Object} Result object
 */
function toolName(args) {
  return {
    success: boolean,      // Did the operation succeed?
    data: object | null,   // Result data if success
    error: string | null   // Error message if failed
  };
}
```

### Error Handling Strategy

**3-tier error handling:**

1. **Tool Level**: Each tool catches and returns errors
   ```javascript
   function write_file(args) {
     try {
       fs.writeFileSync(path, content);
       return { success: true, data: { path } };
     } catch (err) {
       return { success: false, error: err.message };
     }
   }
   ```

2. **Agent Level**: Tracks errors and increments repair counter
   ```javascript
   if (!toolResult.success) {
     state.addIterationError(toolResult.error);
     console.log(`[REPAIR] Error detected (repair #${state.repairs})`);
   }
   ```

3. **LLM Level**: System prompt instructs self-repair
   ```
   RULES:
   2. If build fails, read errors, fix files, retry build.
   ERROR HANDLING:
   - exitCode != 0 means FAILURE. Read stderr, fix the issue, retry.
   ```

## LLM Integration Design

### System Prompt Structure

```javascript
const SYSTEM_PROMPT = `
You are a portfolio maintenance agent...

${PORTFOLIO_SKILL}           // Embedded knowledge about the portfolio

WORKFLOW:                    // Step-by-step process
1. PLAN: Analyze the goal
2. MODIFY: Make file changes
3. BUILD: Run validation
4. COMMIT: Push if requested

AVAILABLE TOOLS:            // Tool documentation
=== FILESYSTEM ===
- write_file(path, content)
...

RESPONSE FORMAT:            // JSON protocol
{"tool": "...", "args": {...}}
{"done": true, "result": "..."}

RULES:                      // Behavioral constraints
1. Call ONE tool at a time
2. If build fails, fix and retry
...
`;
```

### Context Management

Messages are accumulated to maintain conversation context:

```javascript
const messages = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: `Goal: ${goal}` },
  // After each action:
  { role: "assistant", content: '{"tool": "read_file", ...}' },
  { role: "user", content: "Result: {success: true, data: ...}" },
  // State summaries every 3 steps:
  { role: "user", content: "[STATE] build: passed, files: 2, repairs: 0" }
];
```

### Portfolio Skill Embedding

Domain knowledge is embedded directly in the prompt:

```javascript
const PORTFOLIO_SKILL = `
## PORTFOLIO KNOWLEDGE

### File Locations
- Projects: src/lib/chapters.ts
- Journal posts: content/journal/*.mdx
- Footer: src/components/layout/Footer.tsx
...

### Data Structures
interface Chapter {
  slug: string;
  title: string;
  ...
}
...
`;
```

**Benefits:**
- No additional tool calls needed for basic knowledge
- Faster task completion
- More accurate file targeting

## Build Tool Optimizations

### npm_install()

```javascript
function npm_install() {
  const hasLockFile = fs.existsSync("package-lock.json");
  
  if (hasLockFile) {
    // Fast path: npm ci is faster than npm install
    return execNpm(["ci", "--no-audit", "--no-fund", "--prefer-offline"]);
  } else {
    return execNpm(["install", "--no-audit", "--no-fund", "--prefer-offline"]);
  }
}
```

**Flags explained:**
- `--no-audit`: Skip vulnerability scan (~10s saved)
- `--no-fund`: Skip funding messages
- `--prefer-offline`: Use cache when possible

### run_build()

```javascript
function run_build() {
  return execNpm(["run", "build"], {
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",  // Skip telemetry
      CI: "true"                      // Enable CI optimizations
    }
  });
}
```

## Git Integration Design

### Authenticated Push

```javascript
function git_push(branch = "main") {
  const token = process.env.GITHUB_TOKEN;
  
  // Configure remote with token for authentication
  const repoUrl = getRemoteUrl();
  const authedUrl = repoUrl.replace(
    "https://github.com/",
    `https://${token}@github.com/`
  );
  
  execGit(["remote", "set-url", "origin", authedUrl]);
  return execGit(["push", "origin", branch]);
}
```

### Commit Author Configuration

```javascript
function git_commit(message) {
  // Use noreply email for Vercel deployment compatibility
  execGit(["config", "user.email", "user@users.noreply.github.com"]);
  execGit(["config", "user.name", "Portfolio Agent"]);
  return execGit(["commit", "-m", message]);
}
```

## Testing Approach

### Manual Testing Commands

```bash
# Basic file listing
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"task": "List files in the repository"}'

# Complex task
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"task": "Add a new proof item to the homepage"}'
```

### Validation Points

1. **Build Success**: Exit code 0 from `npm run build`
2. **Git Push**: Successful push to remote
3. **Vercel Deploy**: Auto-triggered by GitHub webhook
4. **Live Verification**: Changes visible on production site

## Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | LLM API access | Yes |
| `GITHUB_TOKEN` | Repository push access | Yes |

### Constants

```javascript
// agent/index.js
const MAX_STEPS = 15;        // Maximum iterations
const GOAL_FILE = "goal.txt"; // Task input file

// llm.js
const DEFAULT_MODEL = "gpt-4o";
const FALLBACK_MODEL = "gpt-4o";

// build.js
const BUILD_TIMEOUT = 120000; // 2 minutes
const MAX_BUFFER = 5 * 1024 * 1024; // 5MB output
```

## Future Extensibility

### Adding New Tools

1. Create function in appropriate `tools/*.js` file
2. Add to exports in `tools/index.js`
3. Document in `getToolSchema()`
4. Update system prompt if needed

### Adding New Skills

1. Create documentation in `document.md` format
2. Import into `PORTFOLIO_SKILL` in `llm.js`
3. Add relevant examples to system prompt

### Supporting New Repositories

1. Update `PORTFOLIO_SKILL` with new file structure
2. Adjust build commands if needed
3. Configure appropriate Git remote/token
