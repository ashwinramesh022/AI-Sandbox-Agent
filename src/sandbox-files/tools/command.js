/**
 * COMMAND TOOLS
 * 
 * Whitelisted command execution for the portfolio maintenance agent.
 * Only allows specific safe commands - no arbitrary shell.
 */

const { spawnSync } = require("child_process");

let PROJECT_ROOT = "/vercel/sandbox";

/**
 * Initialize command tools with project root
 */
function initialize(root) {
  PROJECT_ROOT = root;
}

/**
 * Whitelist of allowed commands
 * Maps command name to allowed args patterns
 */
const COMMAND_WHITELIST = {
  // Node.js
  "node": true,
  "npm": true,
  "npx": true,
  
  // Git (handled by git.js, but allowed here for flexibility)
  "git": true,
  
  // File operations
  "ls": true,
  "cat": true,
  "head": true,
  "tail": true,
  "wc": true,
  "find": true,
  "grep": true,
  
  // Basic utilities
  "echo": true,
  "pwd": true,
  "which": true,
  "env": true,
};

/**
 * Blocked commands (never allowed)
 */
const COMMAND_BLOCKLIST = [
  "rm",
  "rmdir", 
  "mv",
  "cp",
  "chmod",
  "chown",
  "sudo",
  "su",
  "curl",
  "wget",
  "ssh",
  "scp",
  "eval",
  "exec",
  "kill",
  "killall",
  "shutdown",
  "reboot",
];

/**
 * Check if a command is allowed
 */
function isCommandAllowed(command) {
  const cmd = command.toLowerCase().trim();
  
  // Check blocklist first
  if (COMMAND_BLOCKLIST.includes(cmd)) {
    return { allowed: false, reason: `Command '${cmd}' is blocked for security` };
  }
  
  // Check whitelist
  if (!COMMAND_WHITELIST[cmd]) {
    return { allowed: false, reason: `Command '${cmd}' is not in whitelist` };
  }
  
  return { allowed: true };
}

/**
 * TOOL: run_command
 * Execute a whitelisted shell command
 */
function run_command(command, args = []) {
  const fullCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;
  console.log(`[TOOL:run_command] cmd="${fullCommand}"`);
  
  try {
    // Check if command is allowed
    const check = isCommandAllowed(command);
    if (!check.allowed) {
      return {
        success: false,
        error: check.reason,
        data: { command, blocked: true },
      };
    }
    
    const result = spawnSync(command, args, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024, // 1MB max output
    });
    
    const exitCode = result.status ?? -1;
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    
    // Log output for visibility
    if (stdout.trim()) {
      console.log(`[CMD] stdout:\n${stdout.substring(0, 1000)}`);
    }
    if (stderr.trim()) {
      console.log(`[CMD] stderr:\n${stderr.substring(0, 500)}`);
    }
    console.log(`[CMD] exitCode=${exitCode}`);
    
    return {
      success: exitCode === 0,
      data: {
        command: fullCommand,
        exitCode: exitCode,
        stdout: stdout,
        stderr: stderr,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  initialize,
  run_command,
  isCommandAllowed,
  COMMAND_WHITELIST,
  COMMAND_BLOCKLIST,
};
