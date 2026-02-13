import { Sandbox } from "@vercel/sandbox";

/**
 * LAYER 1 — Infrastructure Validation
 * 
 * PURPOSE:
 * This API route validates the core sandbox lifecycle:
 * 1. Create sandbox
 * 2. Run a simple command (echo hello)
 * 3. Stream stdout back to client in real-time
 * 4. Destroy sandbox
 * 
 * ARCHITECTURAL BOUNDARY:
 * - This is the HOST layer
 * - The host ONLY manages sandbox lifecycle
 * - In later layers, the agent logic will run INSIDE the sandbox
 * - The host will never execute tools — only the sandbox does
 * 
 * STREAMING:
 * - Uses Web Streams API (ReadableStream) for real-time output
 * - Does NOT buffer the entire response
 * - Each log line is flushed immediately to the client
 * 
 * SECURITY:
 * - Sandbox is ephemeral and destroyed after use
 * - No host filesystem access from sandbox
 * - Timeout prevents runaway execution
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Create a streaming response using Web Streams API
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send log lines with immediate flush
      const log = (prefix: string, message: string) => {
        const line = `[${prefix}] ${message}\n`;
        controller.enqueue(encoder.encode(line));
      };

      let sandbox: Sandbox | null = null;

      try {
        // ============================================================
        // STEP 1: Create Sandbox
        // ============================================================
        log("LIFECYCLE", "Creating sandbox...");
        
        sandbox = await Sandbox.create({
          // Use Node.js 24 runtime inside the sandbox
          runtime: "node24",
          // 5 minute timeout — sandbox auto-destroys after this
          timeout: 5 * 60 * 1000,
        });
        
        log("LIFECYCLE", `Sandbox created: ${sandbox.sandboxId}`);
        log("LIFECYCLE", `Status: ${sandbox.status}`);

        // ============================================================
        // STEP 2: Run Command Inside Sandbox
        // ============================================================
        log("LIFECYCLE", "Running command: echo hello");
        
        // Run a simple echo command to validate execution works
        const result = await sandbox.runCommand("echo", ["hello"]);
        
        // Get the stdout output
        const stdout = await result.stdout();
        log("SANDBOX", `stdout: ${stdout.trim()}`);
        log("SANDBOX", `exitCode: ${result.exitCode}`);

        // Also test that we can see the sandbox environment
        log("LIFECYCLE", "Running command: node --version");
        const nodeVersion = await sandbox.runCommand("node", ["--version"]);
        const nodeOut = await nodeVersion.stdout();
        log("SANDBOX", `Node version: ${nodeOut.trim()}`);

        // ============================================================
        // STEP 3: Demonstrate file operations (preview of Layer 2+)
        // ============================================================
        log("LIFECYCLE", "Testing file write/read...");
        
        await sandbox.writeFiles([
          {
            path: "test.txt",
            content: Buffer.from("Hello from sandbox!"),
          },
        ]);
        log("SANDBOX", "Wrote test.txt");

        const fileContent = await sandbox.readFileToBuffer({ path: "test.txt" });
        if (fileContent) {
          log("SANDBOX", `Read test.txt: ${fileContent.toString()}`);
        }

        // ============================================================
        // STEP 4: Destroy Sandbox
        // ============================================================
        log("LIFECYCLE", "Stopping sandbox...");
        await sandbox.stop();
        log("LIFECYCLE", "Sandbox destroyed successfully");
        
        log("LIFECYCLE", "✅ Layer 1 validation complete");

      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log("ERROR", message);
        
        // Always attempt cleanup on error
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

  // Return streaming response
  // Headers ensure no buffering by proxies
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Transfer-Encoding": "chunked",
      // Prevent nginx/proxy buffering
      "X-Accel-Buffering": "no",
    },
  });
}
