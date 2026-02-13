/**
 * LLM INTEGRATION
 * 
 * OpenAI API calls with portfolio maintenance agent system prompt.
 * Uses strict JSON output for structured tool calling.
 * Includes Vercel React Best Practices skill.
 * 
 * MODELS:
 * - gpt-4o: Fast, capable model for agentic coding tasks
 * - gpt-4o-mini: Cheaper alternative for simpler tasks
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Use gpt-4o by default (fast and capable)
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const FALLBACK_MODEL = "gpt-4o-mini";

/**
 * Vercel React Best Practices Skill (from vercel-labs/agent-skills)
 * 57 rules across 8 categories for React/Next.js performance optimization
 */
const REACT_BEST_PRACTICES_SKILL = `
=== VERCEL REACT BEST PRACTICES SKILL ===
Apply these guidelines when writing, reviewing, or modifying React/Next.js code.

RULE CATEGORIES BY PRIORITY:
1. Eliminating Waterfalls (CRITICAL)
   - async-defer-await: Move await into branches where actually used
   - async-parallel: Use Promise.all() for independent operations
   - async-suspense-boundaries: Use Suspense to stream content

2. Bundle Size Optimization (CRITICAL)
   - bundle-barrel-imports: Import directly, avoid barrel files (import { Button } from './Button' not from './components')
   - bundle-dynamic-imports: Use next/dynamic for heavy components
   - bundle-defer-third-party: Load analytics/logging after hydration
   - bundle-conditional: Load modules only when feature is activated
   - bundle-preload: Preload on hover/focus for perceived speed

3. Server-Side Performance (HIGH)
   - server-cache-react: Use React.cache() for per-request deduplication
   - server-serialization: Minimize data passed to client components
   - server-parallel-fetching: Restructure components to parallelize fetches
   - server-after-nonblocking: Use after() for non-blocking operations

4. Client-Side Data Fetching (MEDIUM-HIGH)
   - client-swr-dedup: Use SWR for automatic request deduplication
   - client-passive-event-listeners: Use passive listeners for scroll

5. Re-render Optimization (MEDIUM)
   - rerender-memo: Extract expensive work into memoized components
   - rerender-derived-state: Subscribe to derived booleans, not raw values
   - rerender-functional-setstate: Use functional setState for stable callbacks
   - rerender-lazy-state-init: Pass function to useState for expensive values
   - rerender-transitions: Use startTransition for non-urgent updates

6. Rendering Performance (MEDIUM)
   - rendering-content-visibility: Use content-visibility for long lists
   - rendering-hoist-jsx: Extract static JSX outside components
   - rendering-conditional-render: Use ternary, not && for conditionals
   - rendering-usetransition-loading: Prefer useTransition for loading state

7. JavaScript Performance (LOW-MEDIUM)
   - js-early-exit: Return early from functions
   - js-set-map-lookups: Use Set/Map for O(1) lookups
   - js-combine-iterations: Combine multiple filter/map into one loop

APPLY THESE PATTERNS when generating or modifying React/Next.js code.
`;

/**
 * Cinema Portfolio Knowledge Skill
 * Comprehensive knowledge about ashwinrameshkannan.com portfolio structure
 */
const CINEMA_PORTFOLIO_SKILL = `
=== CINEMA PORTFOLIO KNOWLEDGE ===

This is Ashwin Ramesh Kannan's portfolio website (ashwinrameshkannan.com).
Tech stack: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion

## FILE MAP (CRITICAL - Use these exact paths)

### Data Files
- PROJECTS: src/lib/chapters.ts (Chapter interface, chapters array)
- CONSTANTS: src/lib/constants.ts (navItems, proofItems, footerLinks, siteConfig)
- MDX UTILS: src/lib/mdx.ts (PostFrontmatter type, getAllPosts, getPostBySlug)

### Pages (Next.js App Router)
- HOMEPAGE: src/app/page.tsx
- ABOUT: src/app/about/page.tsx
- CHAPTERS LIST: src/app/chapters/page.tsx
- CHAPTER DETAIL: src/app/chapters/[slug]/page.tsx
- JOURNAL LIST: src/app/journal/page.tsx
- JOURNAL POST: src/app/journal/[slug]/page.tsx
- RESUME: src/app/resume/page.tsx
- LAYOUT: src/app/layout.tsx
- STYLES: src/app/globals.css

### Components
- HERO: src/components/home/HeroSection.tsx
- PROOF STRIP: src/components/home/ProofStrip.tsx (uses proofItems from constants)
- FEATURED: src/components/home/FeaturedChapters.tsx
- FOOTER: src/components/layout/Footer.tsx
- NAV: src/components/layout/Navigation.tsx
- ABOUT CONTENT: src/components/about/AboutContent.tsx
- CHAPTER HEADER: src/components/chapters/ChapterHeader.tsx
- CHAPTER CONTENT: src/components/chapters/ChapterContent.tsx
- JOURNAL LIST: src/components/journal/JournalList.tsx
- UI BUTTON: src/components/ui/Button.tsx
- UI CARD: src/components/ui/Card.tsx
- UI TAG: src/components/ui/Tag.tsx

### Content
- JOURNAL POSTS: content/journal/*.mdx (MDX files with frontmatter)

## DATA STRUCTURES

### Chapter (Project) Interface
\`\`\`ts
interface Chapter {
  slug: string;           // URL-safe identifier
  title: string;          // Project name
  subtitle: string;       // Short tagline
  description: string;    // Summary paragraph
  date: string;           // "YYYY-MM" format
  tags: string[];         // ["ai", "backend", "full-stack", etc.]
  coverImage?: string;    // Optional image path
  featured?: boolean;     // Show on homepage
  context: string;        // Problem/background
  whatIBuilt: string;     // Solution description
  keyDecisions: string[]; // Technical choices made
  challenges: string[];   // Problems overcome
  outcomes: string[];     // Results/metrics
  techStack: string[];    // Technologies used
  links?: {
    live?: string;
    github?: string;
    demo?: string;
  };
}
\`\`\`

### PostFrontmatter (Journal)
\`\`\`ts
interface PostFrontmatter {
  title: string;
  description: string;
  date: string;           // "YYYY-MM-DD" format
  tags: string[];
  draft?: boolean;        // true = hidden
  coverImage?: string;
}
\`\`\`

### Constants Structure (src/lib/constants.ts)
\`\`\`ts
export const siteConfig = { name, description, url, author };
export const navItems = [{ label, href }];
export const proofItems = [{ label, icon }];  // Homepage highlights
export const footerLinks = { social: [...], pages: [...] };
export const allTags = ["ai", "backend", "full-stack", ...];
\`\`\`

## COMMON TASKS - EXACT STEPS

### Add a New Project
1. Read: src/lib/chapters.ts
2. Add new Chapter object to chapters array
3. Set featured: true if it should appear on homepage
4. Run build to verify

### Add Journal Post
1. Create: content/journal/[slug].mdx
2. Add frontmatter (title, description, date, tags)
3. Write MDX content
4. Run build to verify

### Edit Homepage Hero
1. Edit: src/components/home/HeroSection.tsx
2. Modify text/layout as needed
3. Run build to verify

### Add Proof Strip Item
1. Edit: src/lib/constants.ts
2. Add to proofItems array: { label: "Text", icon: "emoji" }
3. Run build to verify

### Edit Footer
1. Edit: src/components/layout/Footer.tsx
2. Or edit footerLinks in src/lib/constants.ts
3. Run build to verify

### Edit Navigation
1. Edit navItems in src/lib/constants.ts
2. Run build to verify

### Add New Tag Color
1. Edit: src/app/globals.css
2. Add .tag-[name] class with gradient
3. Update getTagColor() in src/lib/utils.ts

## STYLING RULES

- Dark mode ONLY (no light mode)
- Use Tailwind CSS v4 classes
- CSS variables defined in globals.css:
  - --color-bg, --color-text-primary, --color-border
  - --color-highlight, --color-accent-*
- Tag colors: .tag-ai, .tag-backend, .tag-web, .tag-vr, .tag-creative
- Containers: container-narrow (prose), container-wide (full)
- Animations: framer-motion variants in src/lib/motion.ts

## TYPESCRIPT REQUIREMENTS

- All components use TypeScript
- Import types from their source files
- Use proper React 19 patterns
- Next.js 16 app router conventions

## VALID TAGS
ai, backend, full-stack, python, typescript, web, vr, creative, productivity, engineering
`;

/**
 * System prompt for portfolio maintenance agent
 */
const SYSTEM_PROMPT = `You are the Cinema Portfolio Agent - specialized for maintaining ashwinrameshkannan.com.

YOUR MISSION:
Make precise modifications to the cinema-portfolio repository. You have deep knowledge of this specific codebase.

${CINEMA_PORTFOLIO_SKILL}

${REACT_BEST_PRACTICES_SKILL}

SAFE WORKFLOW (CRITICAL - FOLLOW THIS ORDER):
1. BACKUP: Call git_stash_backup() BEFORE any file modifications
2. MODIFY: Make targeted changes with write_file()
3. BUILD: Run npm build - this validates your changes
4. IF BUILD FAILS: Call git_restore_backup() to rollback, then fix and retry
5. IF BUILD PASSES: Call git_clear_backup()
6. COMMIT: git_add(), git_commit() with descriptive message
7. PUSH: git_push() - This automatically creates a feature branch (never pushes to main)
8. PR: git_create_pr(title, body) to create a pull request for review
9. DONE: Report success with PR URL

AVAILABLE TOOLS:

=== FILESYSTEM ===
- write_file(path, content): Write/update a file
- read_file(path): Read file contents
- list_files(dir): List directory (default ".")
- search_files(query, path): Search files (rarely needed - you know the structure!)

=== GIT (SAFE WORKFLOW) ===
- git_stash_backup(): Create backup BEFORE modifications (ALWAYS call first!)
- git_restore_backup(): Rollback all changes if build fails
- git_clear_backup(): Clear backup after successful build
- git_status(): Check working directory status
- git_diff(file?): View changes
- git_add(files): Stage files (default ".")
- git_commit(message): Commit changes
- git_push(branch): Push to feature branch (NEVER pushes to main directly)
- git_create_pr(title, body?): Create pull request from feature branch to main
- git_clone(url, targetDir): Clone repository
- git_log(count): View recent commits

=== BUILD ===
- npm_install(): Install dependencies
- run_build(): Run npm build (PRIMARY verification)
- run_lint(): Run linter
- check_build_output(): Check .next directory exists

=== COMMAND ===
- run_command(command, args): Run whitelisted commands

RESPONSE FORMAT (JSON only):

Plan: {"plan": ["Step 1", "Step 2", ...]}
Tool: {"tool": "tool_name", "args": {...}}
Done: {"done": true, "result": "Summary of changes"}

RULES:
1. ONE tool call at a time
2. ALWAYS call git_stash_backup() before any write_file()
3. ALWAYS call git_restore_backup() if build fails
4. ALWAYS create PR instead of pushing to main
5. Build MUST pass before marking done
6. Match existing code style exactly

ERROR HANDLING:
- Build fails? Call git_restore_backup(), fix the issue, create new backup, retry
- Max 3 retries per error
- Report failure if stuck

EXAMPLE WORKFLOW:

Goal: "Add proof item '10+ Projects 🚀'"
{"plan": ["Backup state", "Read constants", "Modify proofItems", "Build", "Commit and PR"]}
{"tool": "git_stash_backup", "args": {}}
{"tool": "read_file", "args": {"path": "src/lib/constants.ts"}}
{"tool": "write_file", "args": {"path": "src/lib/constants.ts", "content": "..."}}
{"tool": "run_build", "args": {}}
// If build passes:
{"tool": "git_clear_backup", "args": {}}
{"tool": "git_add", "args": {"files": "."}}
{"tool": "git_commit", "args": {"message": "feat: add '10+ Projects' to proof strip"}}
{"tool": "git_push", "args": {}}
{"tool": "git_create_pr", "args": {"title": "Add 10+ Projects highlight", "body": "Adds new proof item to homepage"}}
{"done": true, "result": "Added '10+ Projects 🚀' - PR created at [url]"}`;

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call OpenAI API with strict JSON output and retry logic for rate limits
 * Tries Codex model first, falls back to gpt-4o if not available
 */
async function callLLM(apiKey, messages, model = DEFAULT_MODEL, maxRetries = 3) {
  console.log(`[LLM] Calling ${model} with ${messages.length} messages...`);
  
  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY not provided" };
  }

  // Try the requested model, then fallback
  const modelsToTry = model === FALLBACK_MODEL ? [model] : [model, FALLBACK_MODEL];
  
  for (const currentModel of modelsToTry) {
    const result = await tryModel(apiKey, messages, currentModel, maxRetries);
    if (result.success || !result.modelNotFound) {
      return result;
    }
    console.log(`[LLM] Model ${currentModel} not available, trying fallback...`);
  }
  
  return { success: false, error: "All models failed" };
}

/**
 * Try a specific model with retries
 */
async function tryModel(apiKey, messages, model, maxRetries) {
  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 16384, // Increased for large file writes
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LLM] Request: model=${model}, messages=${messages.length}, temp=0 (attempt ${attempt}/${maxRetries})`);

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 404) {
        // Model not found - signal to try fallback
        console.log(`[LLM] Model ${model} not found (404)`);
        return { success: false, modelNotFound: true, error: `Model ${model} not found` };
      }

      if (response.status === 429) {
        // Rate limited - extract wait time and retry
        const errorText = await response.text();
        const waitMatch = errorText.match(/try again in (\d+\.?\d*)s/i);
        const waitTime = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) : 20000;
        console.log(`[LLM] Rate limited. Waiting ${waitTime/1000}s before retry...`);
        
        if (attempt < maxRetries) {
          await sleep(waitTime + 1000); // Add 1s buffer
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[LLM] HTTP Error: ${response.status}`);
        
        // Check if model doesn't exist
        if (errorText.includes("does not exist") || errorText.includes("model_not_found")) {
          return { success: false, modelNotFound: true, error: `Model ${model} not available` };
        }
        
        return { 
          success: false, 
          error: `OpenAI API error: ${response.status} - ${errorText}` 
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const finishReason = data.choices?.[0]?.finish_reason;
      
      if (!content) {
        return { success: false, error: "No content in OpenAI response" };
      }

      // Check if response was truncated
      if (finishReason === "length") {
        console.log(`[LLM] WARNING: Response truncated (hit max_tokens limit)`);
        return { 
          success: false, 
          error: "Response truncated - file content too large. Try making smaller, targeted changes." 
        };
      }

      console.log(`[LLM] Raw response: ${content.substring(0, 200)}...`);

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        // Check if it looks like truncated JSON
        if (content.length > 1000 && !content.trim().endsWith('}')) {
          return { 
            success: false, 
            error: "Response appears truncated - file content too large. Try making smaller changes." 
          };
        }
        return { 
          success: false, 
          error: `Failed to parse LLM response as JSON: ${content.substring(0, 500)}...` 
        };
      }

      // Handle different response types
      if (parsed.done !== undefined) {
        console.log(`[LLM] Agent signaled done: ${parsed.result}`);
        return { success: true, data: { done: true, result: parsed.result, summary: parsed.summary } };
      } else if (parsed.plan) {
        console.log(`[LLM] Agent provided plan: ${parsed.plan.length} steps`);
        return { success: true, data: { plan: parsed.plan } };
      } else if (parsed.tool && parsed.args !== undefined) {
        console.log(`[LLM] Tool call: ${parsed.tool}(${JSON.stringify(parsed.args)})`);
        return { success: true, data: { tool: parsed.tool, args: parsed.args } };
      } else {
        return { 
          success: false, 
          error: `Invalid response structure: ${content}` 
        };
      }

    } catch (err) {
      console.log(`[LLM] Error on attempt ${attempt}: ${err.message}`);
      if (attempt === maxRetries) {
        return { success: false, error: err.message };
      }
      // Wait before retry on network errors
      await sleep(2000 * attempt);
    }
  }
  
  return { success: false, error: "Max retries exceeded" };
}

/**
 * Format tool result for LLM context
 */
function formatToolResult(toolName, result) {
  const isError = !result.success || 
    (result.data?.exitCode !== undefined && result.data.exitCode !== 0);
  
  let content;
  if (isError && result.data?.exitCode !== undefined) {
    content = `⚠️ COMMAND FAILED (exitCode=${result.data.exitCode})
Command: ${result.data.command || toolName}
Stdout: ${result.data.stdout || "(empty)"}
Stderr: ${result.data.stderr || "(empty)"}

You MUST fix the error before marking done.`;
  } else if (!result.success) {
    content = `⚠️ TOOL ERROR: ${result.error}
You may need to try a different approach.`;
  } else {
    content = `Tool "${toolName}" succeeded:\n${JSON.stringify(result.data, null, 2)}`;
  }
  
  return {
    role: "user",
    content
  };
}

/**
 * Format initial goal for LLM
 */
function formatGoal(goal) {
  return {
    role: "user", 
    content: `GOAL: ${goal}

First, provide a plan with concrete steps. Then execute each step.`
  };
}

/**
 * Format state summary for LLM context
 */
function formatStateSummary(state) {
  return {
    role: "user",
    content: `CURRENT STATE:
- Files changed: ${state.changed_files.join(", ") || "none"}
- Build: ${state.build.success === null ? "not run" : state.build.success ? "passed" : "failed"}
- Verification: ${state.verification.success === null ? "not run" : state.verification.success ? "passed" : "failed"}
- Iteration: ${state.iteration.count}/${state.iteration.max}
- Repairs: ${state.iteration.repairs}`
  };
}

module.exports = {
  callLLM,
  formatToolResult,
  formatGoal,
  formatStateSummary,
  SYSTEM_PROMPT,
};
