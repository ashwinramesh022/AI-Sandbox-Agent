/**
 * TOOLS INDEX
 * 
 * Central export for all agent tools.
 * Initialize all tools with project root before use.
 */

const filesystem = require("./filesystem.js");
const git = require("./git.js");
const build = require("./build.js");
const command = require("./command.js");
const browser = require("./browser.js");

/**
 * Initialize all tools with project root
 */
function initializeAll(projectRoot) {
  console.log(`[TOOLS] Initializing all tools with root: ${projectRoot}`);
  filesystem.initialize(projectRoot);
  git.initialize(projectRoot);
  build.initialize(projectRoot);
  command.initialize(projectRoot);
  browser.initialize(projectRoot);
}

/**
 * Get all available tools as a map
 */
function getAllTools() {
  return {
    // Filesystem
    write_file: filesystem.write_file,
    read_file: filesystem.read_file,
    list_files: filesystem.list_files,
    search_files: filesystem.search_files,
    
    // Git
    git_clone: git.git_clone,
    git_status: git.git_status,
    git_diff: git.git_diff,
    git_add: git.git_add,
    git_commit: git.git_commit,
    git_push: git.git_push,
    git_create_pr: git.git_create_pr,
    git_stash_backup: git.git_stash_backup,
    git_restore_backup: git.git_restore_backup,
    git_clear_backup: git.git_clear_backup,
    git_log: git.git_log,
    
    // Build
    npm_install: build.npm_install,
    run_build: build.run_build,
    run_lint: build.run_lint,
    check_build_output: build.check_build_output,
    
    // Command (whitelisted)
    run_command: command.run_command,
    
    // Verification (lightweight HTTP)
    verify_url: browser.verify_url,
  };
}

/**
 * Get tool schema for LLM system prompt
 */
function getToolSchema() {
  return `
AVAILABLE TOOLS:

=== FILESYSTEM ===
- write_file(path, content): Write content to a file
- read_file(path): Read a file's contents  
- list_files(dir): List directory contents (default: ".")
- search_files(query, path): Search for files by name or content

=== GIT ===
- git_clone(url, targetDir): Clone a repository
- git_status(): Get current git status
- git_diff(file?): Get diff of changes
- git_add(files): Stage files (default: ".")
- git_commit(message): Commit staged changes
- git_push(branch): Push to FEATURE BRANCH (auto-creates, never pushes to main)
- git_create_pr(title, body?): Create pull request from feature branch to main
- git_stash_backup(): Create backup before modifications (call before editing files)
- git_restore_backup(): Restore to pre-modification state (call if build fails)
- git_clear_backup(): Clear backup after successful build
- git_log(count): Get recent commits (default: 5)

=== BUILD ===
- npm_install(): Install dependencies (fast with --prefer-offline)
- run_build(): Run npm build
- run_lint(): Run linter
- check_build_output(): Check if build output exists

=== COMMAND ===
- run_command(command, args): Run whitelisted command
  Allowed: node, npm, npx, git, ls, cat, head, tail, grep, echo, pwd
  Blocked: rm, curl, wget, sudo, ssh, kill, etc.

=== VERIFICATION ===
- verify_url(url, expectedContent?, timeout?): Verify URL is accessible (lightweight HTTP check)

SAFETY WORKFLOW:
1. git_stash_backup() - Create backup BEFORE any file changes
2. Make modifications with write_file()
3. run_build() - Validate changes
4. If build fails: git_restore_backup() to rollback
5. If build passes: git_clear_backup(), git_add(), git_commit(), git_push(), git_create_pr()
`;
}

module.exports = {
  initializeAll,
  getAllTools,
  getToolSchema,
  
  // Export individual modules for direct access
  filesystem,
  git,
  build,
  command,
  browser,
};
