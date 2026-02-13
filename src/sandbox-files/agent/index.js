/**
 * PORTFOLIO MAINTENANCE AGENT
 * 
 * Main agent loop that:
 * 1. Reads goal from goal.txt (injected by host)
 * 2. Plans steps to accomplish goal
 * 3. Modifies repository files
 * 4. Runs build validation
 * 5. Verifies changes on dev server
 * 6. Optionally commits and pushes
 * 
 * RUNS ENTIRELY INSIDE SANDBOX
 * Host only injects files and runs `node agent/index.js`
 */

const fs = require("fs");
const path = require("path");
const tools = require("../tools/index.js");
const llm = require("./llm.js");
const state = require("./state.js");

// ================================================================
// CONFIGURATION
// ================================================================

const MAX_STEPS = 15;  // Higher limit for portfolio tasks
const GOAL_FILE = "goal.txt";

// Get API key from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ================================================================
// TOOL DISPATCHER
// ================================================================

async function executeTool(toolName, args) {
  console.log(`\n[EXEC] ${toolName}(${JSON.stringify(args)})`);
  
  const allTools = tools.getAllTools();
  
  if (!allTools[toolName]) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  
  // Track file changes
  if (toolName === "write_file" && args.path) {
    state.addChangedFile(args.path);
  }
  
  // Execute tool (some are async)
  const tool = allTools[toolName];
  const result = await Promise.resolve(tool(args.path || args.dir || args.url || args.query || args.command || args.message || args.files || args.file || args.port || args.branch || args.count || args.targetDir, 
    args.content || args.args || args.path || args.port || args.targetDir));
  
  // Update state based on results
  if (toolName === "run_build") {
    state.setBuildStatus(result.success, result.data?.errors || [], result.data?.stdout);
  }
  if (toolName === "start_dev_server" && result.success) {
    state.setDevServerStatus(true, result.data?.port, result.data?.pid);
  }
  if (toolName === "stop_dev_server") {
    state.setDevServerStatus(false);
  }
  if (toolName === "check_dev_server") {
    state.setVerificationStatus(result.success, [{ path: args.path, success: result.success }]);
  }
  if (toolName === "git_commit" && result.success) {
    state.setGitStatus(true, false, result.data?.commit_hash);
  }
  if (toolName === "git_push" && result.success) {
    state.setGitStatus(true, true, state.get().git.commit_hash);
  }
  
  return result;
}

/**
 * Better tool argument handling
 */
async function executeToolWithArgs(toolName, args) {
  console.log(`\n[EXEC] ${toolName}(${JSON.stringify(args)})`);
  
  const allTools = tools.getAllTools();
  
  if (!allTools[toolName]) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  
  // Track file changes
  if (toolName === "write_file" && args.path) {
    state.addChangedFile(args.path);
  }
  
  let result;
  
  // Call tool with proper arguments
  switch (toolName) {
    // Filesystem
    case "write_file":
      result = allTools[toolName](args.path, args.content);
      break;
    case "read_file":
      result = allTools[toolName](args.path);
      break;
    case "list_files":
      result = allTools[toolName](args.dir || args.path || ".");
      break;
    case "search_files":
      result = allTools[toolName](args.query, args.path || ".");
      break;
      
    // Git
    case "git_clone":
      result = allTools[toolName](args.url, args.targetDir || ".");
      break;
    case "git_status":
      result = allTools[toolName]();
      break;
    case "git_diff":
      result = allTools[toolName](args.file);
      break;
    case "git_add":
      result = allTools[toolName](args.files || ".");
      break;
    case "git_commit":
      result = allTools[toolName](args.message);
      break;
    case "git_push":
      result = allTools[toolName](args.branch || "main");
      break;
    case "git_create_pr":
      result = await allTools[toolName](args.title, args.body || "");
      break;
    case "git_stash_backup":
      result = allTools[toolName]();
      break;
    case "git_restore_backup":
      result = allTools[toolName]();
      break;
    case "git_clear_backup":
      result = allTools[toolName]();
      break;
    case "git_log":
      result = allTools[toolName](args.count || 5);
      break;
      
    // Build
    case "npm_install":
      result = allTools[toolName]();
      break;
    case "run_build":
      result = allTools[toolName]();
      break;
    case "run_lint":
      result = allTools[toolName]();
      break;
    case "start_dev_server":
      result = await allTools[toolName](args.port || 3000);
      break;
    case "stop_dev_server":
      result = allTools[toolName]();
      break;
    case "check_dev_server":
      result = await allTools[toolName](args.path || "/");
      break;
    case "check_build_output":
      result = allTools[toolName]();
      break;
      
    // Command
    case "run_command":
      result = allTools[toolName](args.command, args.args || []);
      break;
      
    // Browser/Verification
    case "take_screenshot":
      result = await allTools[toolName](args);
      break;
    case "verify_deployment":
      result = await allTools[toolName](args);
      break;
    case "wait_for_dev_server":
      result = await allTools[toolName](args);
      break;
    case "extract_page_content":
      result = await allTools[toolName](args);
      break;
      
    default:
      result = { success: false, error: `Unhandled tool: ${toolName}` };
  }
  
  // Await if promise
  result = await Promise.resolve(result);
  
  // Update state based on results
  if (toolName === "run_build") {
    state.setBuildStatus(result.success, result.data?.errors || [], result.data?.stdout);
  }
  if (toolName === "start_dev_server" && result.success) {
    state.setDevServerStatus(true, result.data?.port, result.data?.pid);
  }
  if (toolName === "stop_dev_server") {
    state.setDevServerStatus(false);
  }
  if (toolName === "check_dev_server") {
    state.setVerificationStatus(result.success, [{ path: args.path || "/", success: result.success }]);
  }
  if (toolName === "git_commit" && result.success) {
    state.setGitStatus(true, false, result.data?.commit_hash);
  }
  if (toolName === "git_push" && result.success) {
    state.setGitStatus(true, true, state.get().git.commit_hash, result.data?.branch);
  }
  if (toolName === "git_create_pr" && result.success) {
    state.setGitStatus(true, true, state.get().git.commit_hash, result.data?.branch, result.data?.pr_url);
  }
  
  return result;
}

// ================================================================
// MAIN AGENT LOOP
// ================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("PORTFOLIO MAINTENANCE AGENT");
  console.log("=".repeat(60));

  // Environment info
  console.log("\n[ENV] Sandbox PID:", process.pid);
  console.log("[ENV] Working directory:", process.cwd());
  console.log("[ENV] Node version:", process.version);
  console.log("[ENV] MAX_STEPS:", MAX_STEPS);
  console.log("[ENV] API Key present:", OPENAI_API_KEY ? "Yes" : "NO!");

  if (!OPENAI_API_KEY) {
    console.log("\n[FATAL] OPENAI_API_KEY not found!");
    process.exit(1);
  }

  // Initialize tools with current directory as project root
  const projectRoot = process.cwd();
  tools.initializeAll(projectRoot);

  // Reset state
  state.reset();
  state.update({ iteration: { max: MAX_STEPS } });

  // ============================================================
  // Read goal from goal.txt
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("READING GOAL");
  console.log("=".repeat(60));

  let goal;
  
  try {
    if (fs.existsSync(GOAL_FILE)) {
      goal = fs.readFileSync(GOAL_FILE, "utf8").trim();
    } else {
      goal = "List all files in the current directory and report the project structure.";
    }
  } catch (err) {
    console.log(`[ERROR] Failed to read goal: ${err.message}`);
    process.exit(1);
  }

  console.log(`[GOAL] ${goal}`);
  state.setGoal(goal);

  // Check if this is a project directory (repo was cloned via sandbox source option)
  // The Vercel Sandbox `source` option clones the repo at sandbox creation time
  if (fs.existsSync(path.join(projectRoot, "package.json"))) {
    console.log("\n" + "=".repeat(60));
    console.log("PROJECT DETECTED");
    console.log("=".repeat(60));
    console.log(`[INIT] Found package.json - this appears to be a cloned repository`);
    
    // Auto-install dependencies
    console.log(`[INIT] Installing dependencies...`);
    const installResult = await executeToolWithArgs("npm_install", {});
    if (installResult.success) {
      console.log(`[INIT] Dependencies installed successfully`);
    } else {
      console.log(`[INIT] Warning: npm install failed: ${installResult.error}`);
    }
  }

  // ============================================================
  // Agent Loop
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("STARTING AGENT LOOP");
  console.log("=".repeat(60));

  const messages = [llm.formatGoal(goal)];
  let done = false;
  let finalResult = null;

  while (state.get().iteration.count < MAX_STEPS && !done) {
    state.incrementIteration();
    const currentState = state.get();
    const step = currentState.iteration.count;
    
    console.log(`\n${"─".repeat(60)}`);
    console.log(`STEP ${step}/${MAX_STEPS}`);
    console.log(`[STATE] ${JSON.stringify(state.getSummary())}`);
    console.log("─".repeat(60));

    // Call LLM
    console.log("[LLM] Requesting next action...");
    const response = await llm.callLLM(OPENAI_API_KEY, messages);

    if (!response.success) {
      console.log(`[ERROR] LLM call failed: ${response.error}`);
      state.addIterationError(response.error);
      break;
    }

    const action = response.data;

    // Handle plan response
    if (action.plan) {
      console.log(`[PLAN] ${action.plan.length} steps:`);
      action.plan.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
      state.setPlan(action.plan);
      
      messages.push({ role: "assistant", content: JSON.stringify(action) });
      messages.push({ role: "user", content: "Execute the plan step by step. Start with step 1." });
      continue;
    }

    // Handle done response
    if (action.done) {
      console.log(`[DONE] ${action.result}`);
      done = true;
      finalResult = action.result;
      break;
    }

    // Handle tool call
    if (!action.tool) {
      console.log("[ERROR] Invalid response - no tool specified");
      state.addIterationError("Invalid LLM response");
      break;
    }

    const toolResult = await executeToolWithArgs(action.tool, action.args || {});
    console.log(`[RESULT] success=${toolResult.success}`);
    
    if (toolResult.data) {
      // Truncate large outputs for logging
      const dataStr = JSON.stringify(toolResult.data);
      console.log(`[DATA] ${dataStr.substring(0, 500)}${dataStr.length > 500 ? "..." : ""}`);
    }

    // Track errors
    const isError = !toolResult.success || 
      (toolResult.data?.exitCode !== undefined && toolResult.data.exitCode !== 0);
    
    if (isError) {
      state.addIterationError(toolResult.error || `${action.tool} failed`);
      console.log(`[REPAIR] ⚠️ Error detected (repair #${state.get().iteration.repairs})`);
    }

    // Add to context
    messages.push({ role: "assistant", content: JSON.stringify(action) });
    messages.push(llm.formatToolResult(action.tool, toolResult));

    // Add state summary periodically
    if (step % 3 === 0) {
      messages.push(llm.formatStateSummary(state.get()));
    }

    console.log(`[CONTEXT] ${messages.length} messages`);
  }

  // ============================================================
  // Cleanup
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("CLEANUP");
  console.log("=".repeat(60));

  // Stop dev server if running
  if (state.get().dev_server.running) {
    console.log("[CLEANUP] Stopping dev server...");
    await executeToolWithArgs("stop_dev_server", {});
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("AGENT COMPLETE");
  console.log("=".repeat(60));

  const finalState = state.get();
  console.log(`\n[SUMMARY]`);
  console.log(`  Goal: ${finalState.goal?.substring(0, 50)}...`);
  console.log(`  Steps: ${finalState.iteration.count}/${MAX_STEPS}`);
  console.log(`  Files changed: ${finalState.changed_files.length}`);
  console.log(`  Build: ${finalState.build.success === null ? "not run" : finalState.build.success ? "✓ passed" : "✗ failed"}`);
  console.log(`  Verification: ${finalState.verification.success === null ? "not run" : finalState.verification.success ? "✓ passed" : "✗ failed"}`);
  console.log(`  Git: ${finalState.git.pushed ? "pushed" : finalState.git.committed ? "committed" : "uncommitted"}`);
  console.log(`  Repairs: ${finalState.iteration.repairs}`);
  console.log(`  Completed: ${done}`);
  console.log(`  Result: ${finalResult || "(no result)"}`);

  // List files changed
  if (finalState.changed_files.length > 0) {
    console.log(`\n[FILES CHANGED]`);
    finalState.changed_files.forEach(f => console.log(`  📄 ${f}`));
  }

  console.log("\n" + "=".repeat(60));
  console.log("AGENT FINISHED");
  console.log("=".repeat(60));
}

// Run
main().catch((err) => {
  console.error("[FATAL]", err.message);
  console.error(err.stack);
  process.exit(1);
});
