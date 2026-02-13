import { Sandbox } from "@vercel/sandbox";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * PORTFOLIO MAINTENANCE AGENT — Host API Route
 * 
 * PURPOSE:
 * Run a coding agent inside a Vercel Sandbox to automatically
 * modify, build, and verify changes to a repository.
 * 
 * FLOW:
 * 1. Create sandbox (optionally clone a source repo)
 * 2. Inject agent files (tools/*, agent/*, goal.txt)
 * 3. Run agent/index.js
 * 4. Stream stdout back to client
 * 5. Destroy sandbox
 * 
 * TOOLS AVAILABLE:
 * - filesystem: read, write, list, search files
 * - git: clone, status, diff, add, commit, push
 * - build: npm install, build, lint, dev server
 * - browser: screenshot, verify deployment
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Default task for testing
const DEFAULT_TASK = `List the files in the current directory and describe what kind of project this is.`;

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  // Parse request body
  let goal = DEFAULT_TASK;
  let repoUrl = "";
  let githubToken = "";

  try {
    const body = await request.json();
    if (body.task && typeof body.task === "string") {
      goal = body.task;
    }
    if (body.repoUrl && typeof body.repoUrl === "string") {
      repoUrl = body.repoUrl;
    }
  } catch {
    // No body or invalid JSON - use defaults
  }

  // Get tokens from environment
  githubToken = process.env.GITHUB_ACCESS_TOKEN || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  const stream = new ReadableStream({
    async start(controller) {
      const log = (prefix: string, message: string) => {
        const line = `[${prefix}] ${message}\n`;
        controller.enqueue(encoder.encode(line));
      };

      let sandbox: Sandbox | null = null;

      try {
        // ============================================================
        // STEP 1: Create Sandbox (with source repo if provided)
        // ============================================================
        log("LIFECYCLE", "Creating sandbox...");

        const sandboxOptions: Parameters<typeof Sandbox.create>[0] = {
          runtime: "node24",
          timeout: 5 * 60 * 1000, // 5 minutes
        };

        // If repo URL provided, use source option to clone at creation
        if (repoUrl) {
          log("LIFECYCLE", `Cloning repository: ${repoUrl}`);
          const gitUrl = repoUrl.endsWith(".git") ? repoUrl : `${repoUrl}.git`;
          
          if (githubToken) {
            sandboxOptions.source = {
              type: "git",
              url: gitUrl,
              username: "x-access-token",
              password: githubToken,
            };
          } else {
            sandboxOptions.source = {
              type: "git",
              url: gitUrl,
            };
          }
        }

        sandbox = await Sandbox.create(sandboxOptions);
        log("LIFECYCLE", `Sandbox created: ${sandbox.sandboxId}`);
        log("LIFECYCLE", `Goal: ${goal.substring(0, 100)}${goal.length > 100 ? "..." : ""}`);
        if (repoUrl) {
          log("LIFECYCLE", `Repository cloned: ${repoUrl}`);
        }

        // ============================================================
        // STEP 2: Inject Agent Files
        // ============================================================
        const sandboxFilesDir = join(process.cwd(), "src/sandbox-files");
        log("LIFECYCLE", "Loading agent files...");

        const filesystemToolCode = readFileSync(join(sandboxFilesDir, "tools/filesystem.js"), "utf8");
        const gitToolCode = readFileSync(join(sandboxFilesDir, "tools/git.js"), "utf8");
        const buildToolCode = readFileSync(join(sandboxFilesDir, "tools/build.js"), "utf8");
        const commandToolCode = readFileSync(join(sandboxFilesDir, "tools/command.js"), "utf8");
        const browserToolCode = readFileSync(join(sandboxFilesDir, "tools/browser.js"), "utf8");
        const toolsIndexCode = readFileSync(join(sandboxFilesDir, "tools/index.js"), "utf8");
        const agentStateCode = readFileSync(join(sandboxFilesDir, "agent/state.js"), "utf8");
        const agentLlmCode = readFileSync(join(sandboxFilesDir, "agent/llm.js"), "utf8");
        const agentIndexCode = readFileSync(join(sandboxFilesDir, "agent/index.js"), "utf8");

        await sandbox.writeFiles([
          { path: "tools/filesystem.js", content: Buffer.from(filesystemToolCode) },
          { path: "tools/git.js", content: Buffer.from(gitToolCode) },
          { path: "tools/build.js", content: Buffer.from(buildToolCode) },
          { path: "tools/command.js", content: Buffer.from(commandToolCode) },
          { path: "tools/browser.js", content: Buffer.from(browserToolCode) },
          { path: "tools/index.js", content: Buffer.from(toolsIndexCode) },
          { path: "agent/state.js", content: Buffer.from(agentStateCode) },
          { path: "agent/llm.js", content: Buffer.from(agentLlmCode) },
          { path: "agent/index.js", content: Buffer.from(agentIndexCode) },
          { path: "goal.txt", content: Buffer.from(goal) },
        ]);
        log("LIFECYCLE", "Injected: tools/*, agent/*, goal.txt");

        // Show directory listing
        const lsResult = await sandbox.runCommand("ls", ["-la"]);
        const lsOutput = await lsResult.stdout();
        log("SANDBOX", `Contents:\n${lsOutput}`);

        // ============================================================
        // STEP 3: Run Agent
        // ============================================================
        if (!openaiKey) {
          log("WARNING", "OPENAI_API_KEY not set - LLM calls will fail");
        } else {
          log("LIFECYCLE", "OPENAI_API_KEY present");
        }

        log("LIFECYCLE", "--- Starting Agent ---");

        const agentResult = await sandbox.runCommand({
          cmd: "node",
          args: ["agent/index.js"],
          env: { 
            OPENAI_API_KEY: openaiKey,
            GITHUB_TOKEN: githubToken, // For git push authentication
          },
        });

        const stdout = await agentResult.stdout();
        const stderr = await agentResult.stderr();

        stdout.split("\n").forEach((line) => {
          if (line.trim()) log("AGENT", line);
        });
        if (stderr.trim()) {
          stderr.split("\n").forEach((line) => {
            if (line.trim()) log("AGENT:ERR", line);
          });
        }

        log("LIFECYCLE", `Agent exit code: ${agentResult.exitCode}`);

        // ============================================================
        // STEP 4: Cleanup
        // ============================================================
        log("LIFECYCLE", "Stopping sandbox...");
        await sandbox.stop();
        log("LIFECYCLE", "Sandbox destroyed");
        log("LIFECYCLE", "✅ Agent execution complete");

      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const stack = error instanceof Error ? error.stack : "";
        log("ERROR", message);
        if (stack) log("ERROR", stack);

        if (sandbox) {
          try {
            await sandbox.stop();
            log("LIFECYCLE", "Sandbox cleaned up after error");
          } catch {
            log("ERROR", "Failed to cleanup sandbox");
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Accel-Buffering": "no",
    },
  });
}
