/**
 * GIT TOOLS
 * 
 * Safe git operations for the portfolio maintenance agent.
 * All commands are whitelisted - no arbitrary shell execution.
 * 
 * SAFETY FEATURES:
 * - Pushes to feature branches, not main
 * - Creates PRs instead of direct pushes
 * - Backup/restore via git stash for rollback
 */

const { spawnSync } = require("child_process");
const path = require("path");

let PROJECT_ROOT = "/vercel/sandbox";
let BACKUP_STASH_REF = null; // Tracks our backup stash

/**
 * Initialize git tools with project root
 */
function initialize(root) {
  PROJECT_ROOT = root;
  BACKUP_STASH_REF = null; // Reset backup state
}

/**
 * Execute a git command safely
 */
function execGit(args, options = {}) {
  console.log(`[GIT] git ${args.join(" ")}`);
  
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    timeout: 60000, // 60 second timeout
    maxBuffer: 1024 * 1024,
    ...options,
  });
  
  const exitCode = result.status ?? -1;
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  
  if (stdout.trim()) {
    console.log(`[GIT] stdout: ${stdout.substring(0, 500)}`);
  }
  if (stderr.trim()) {
    console.log(`[GIT] stderr: ${stderr.substring(0, 500)}`);
  }
  
  return { exitCode, stdout, stderr };
}

/**
 * TOOL: git_clone
 * Clone a repository into the project root
 */
function git_clone(repoUrl, targetDir = ".") {
  console.log(`[TOOL:git_clone] url="${repoUrl}" target="${targetDir}"`);
  
  try {
    // Validate URL (basic check)
    if (!repoUrl.startsWith("https://") && !repoUrl.startsWith("git@")) {
      return { success: false, error: "Invalid repository URL" };
    }
    
    const targetPath = path.resolve(PROJECT_ROOT, targetDir);
    
    const result = execGit(["clone", "--depth", "1", repoUrl, targetPath]);
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `Clone failed: ${result.stderr}`,
        data: { exitCode: result.exitCode, stderr: result.stderr },
      };
    }
    
    // Update PROJECT_ROOT to cloned directory
    PROJECT_ROOT = targetPath;
    
    return {
      success: true,
      data: {
        cloned_to: targetPath,
        stdout: result.stdout,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_status
 * Get current git status
 */
function git_status() {
  console.log(`[TOOL:git_status]`);
  
  try {
    const result = execGit(["status", "--porcelain"]);
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `git status failed: ${result.stderr}`,
      };
    }
    
    // Parse status output
    const lines = result.stdout.trim().split("\n").filter(Boolean);
    const changes = lines.map((line) => {
      const status = line.substring(0, 2).trim();
      const file = line.substring(3);
      return { status, file };
    });
    
    return {
      success: true,
      data: {
        clean: changes.length === 0,
        changes,
        summary: changes.length === 0 
          ? "Working directory clean" 
          : `${changes.length} file(s) changed`,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_diff
 * Get diff of changes
 */
function git_diff(file = null) {
  console.log(`[TOOL:git_diff] file=${file || "(all)"}`);
  
  try {
    const args = ["diff"];
    if (file) args.push(file);
    
    const result = execGit(args);
    
    return {
      success: true,
      data: {
        diff: result.stdout || "(no changes)",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_add
 * Stage files for commit
 */
function git_add(files = ".") {
  console.log(`[TOOL:git_add] files="${files}"`);
  
  try {
    const fileList = Array.isArray(files) ? files : [files];
    const result = execGit(["add", ...fileList]);
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `git add failed: ${result.stderr}`,
      };
    }
    
    return {
      success: true,
      data: {
        staged: fileList,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_commit
 * Commit staged changes
 */
function git_commit(message) {
  console.log(`[TOOL:git_commit] message="${message.substring(0, 50)}..."`);
  
  try {
    if (!message || message.trim().length === 0) {
      return { success: false, error: "Commit message required" };
    }
    
    // Configure git user if not set (for sandbox environment)
    // Use GitHub's no-reply email for Vercel deployment compatibility
    execGit(["config", "user.email", "ashwinramesh022@users.noreply.github.com"]);
    execGit(["config", "user.name", "ashwinramesh022"]);
    
    const result = execGit(["commit", "-m", message]);
    
    if (result.exitCode !== 0) {
      // Check if nothing to commit
      if (result.stdout.includes("nothing to commit")) {
        return {
          success: true,
          data: { message: "Nothing to commit", commit_hash: null },
        };
      }
      return {
        success: false,
        error: `git commit failed: ${result.stderr || result.stdout}`,
      };
    }
    
    // Extract commit hash
    const hashMatch = result.stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const commitHash = hashMatch ? hashMatch[1] : null;
    
    return {
      success: true,
      data: {
        message,
        commit_hash: commitHash,
        stdout: result.stdout,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_push
 * Push commits to a FEATURE BRANCH (never main directly)
 * Creates branch if it doesn't exist
 */
function git_push(branch = "main") {
  // SAFETY: Never push directly to main - use feature branch
  const timestamp = Date.now();
  const featureBranch = branch === "main" 
    ? `agent/changes-${timestamp}` 
    : branch;
  
  console.log(`[TOOL:git_push] Pushing to feature branch: "${featureBranch}" (requested: "${branch}")`);
  
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    
    // Create and checkout feature branch
    const checkoutResult = execGit(["checkout", "-b", featureBranch]);
    if (checkoutResult.exitCode !== 0 && !checkoutResult.stderr.includes("already exists")) {
      // Branch might exist, try just checkout
      execGit(["checkout", featureBranch]);
    }
    
    // If we have a token, configure the remote URL with auth
    if (githubToken) {
      // Get current remote URL
      const remoteResult = execGit(["remote", "get-url", "origin"]);
      if (remoteResult.exitCode === 0) {
        const currentUrl = remoteResult.stdout.trim();
        // Convert https://github.com/user/repo to https://token@github.com/user/repo
        if (currentUrl.startsWith("https://github.com/")) {
          const repoPath = currentUrl.replace("https://github.com/", "");
          const authUrl = `https://x-access-token:${githubToken}@github.com/${repoPath}`;
          execGit(["remote", "set-url", "origin", authUrl]);
          console.log("[GIT] Configured remote with auth token");
        }
      }
    }
    
    // Push feature branch to remote
    const result = execGit(["push", "-u", "origin", featureBranch]);
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `git push failed: ${result.stderr}`,
        data: { exitCode: result.exitCode },
      };
    }
    
    return {
      success: true,
      data: {
        branch: featureBranch,
        originalRequest: branch,
        pushed: true,
        stdout: result.stdout,
        note: branch === "main" 
          ? "Pushed to feature branch instead of main for safety. Use git_create_pr to create a pull request."
          : "Pushed successfully",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_create_pr
 * Create a pull request via GitHub API
 * Requires GITHUB_TOKEN environment variable
 */
async function git_create_pr(title, body = "") {
  console.log(`[TOOL:git_create_pr] title="${title.substring(0, 50)}..."`);
  
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return { success: false, error: "GITHUB_TOKEN not available for PR creation" };
    }
    
    // Get current branch
    const branchResult = execGit(["rev-parse", "--abbrev-ref", "HEAD"]);
    if (branchResult.exitCode !== 0) {
      return { success: false, error: "Could not determine current branch" };
    }
    const currentBranch = branchResult.stdout.trim();
    
    if (currentBranch === "main") {
      return { success: false, error: "Cannot create PR from main branch. Push to a feature branch first." };
    }
    
    // Get repo info from remote URL
    const remoteResult = execGit(["remote", "get-url", "origin"]);
    if (remoteResult.exitCode !== 0) {
      return { success: false, error: "Could not get remote URL" };
    }
    
    const remoteUrl = remoteResult.stdout.trim();
    // Extract owner/repo from URL (handles both https and token-embedded URLs)
    const repoMatch = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!repoMatch) {
      return { success: false, error: `Could not parse repo from URL: ${remoteUrl}` };
    }
    
    const [, owner, repo] = repoMatch;
    const repoName = repo.replace(/\.git$/, "");
    
    console.log(`[GIT] Creating PR: ${owner}/${repoName} ${currentBranch} -> main`);
    
    // Create PR via GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        body: body || `Automated changes by Portfolio Agent\n\nBranch: ${currentBranch}`,
        head: currentBranch,
        base: "main",
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log(`[GIT] PR creation failed: ${response.status} ${errorData}`);
      return { 
        success: false, 
        error: `GitHub API error: ${response.status}`,
        data: { response: errorData }
      };
    }
    
    const prData = await response.json();
    
    return {
      success: true,
      data: {
        pr_number: prData.number,
        pr_url: prData.html_url,
        title: prData.title,
        branch: currentBranch,
        base: "main",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_stash_backup
 * Create a backup of current state before modifications
 * Call this BEFORE making any file changes
 */
function git_stash_backup() {
  console.log(`[TOOL:git_stash_backup] Creating backup of current state`);
  
  try {
    // First, check if there are any changes to stash
    const statusResult = execGit(["status", "--porcelain"]);
    const hasChanges = statusResult.stdout.trim().length > 0;
    
    if (hasChanges) {
      // Stash existing changes with a marker message
      const stashResult = execGit(["stash", "push", "-m", "AGENT_BACKUP_PRE_MODIFICATION"]);
      if (stashResult.exitCode !== 0) {
        return { success: false, error: `Stash failed: ${stashResult.stderr}` };
      }
      BACKUP_STASH_REF = "stash@{0}";
    }
    
    // Record the current HEAD for reference
    const headResult = execGit(["rev-parse", "HEAD"]);
    const headSha = headResult.stdout.trim();
    
    return {
      success: true,
      data: {
        backup_created: true,
        stashed_changes: hasChanges,
        head_sha: headSha,
        message: "Backup created. If build fails, call git_restore_backup to rollback.",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_restore_backup
 * Restore state from backup after a failed build
 * Call this when build fails to revert all changes
 */
function git_restore_backup() {
  console.log(`[TOOL:git_restore_backup] Restoring from backup`);
  
  try {
    // Discard all current changes (unstaged and staged)
    execGit(["checkout", "."]);
    execGit(["clean", "-fd"]); // Remove untracked files
    
    // Reset any staged changes
    execGit(["reset", "HEAD"]);
    
    // If we stashed changes before, restore them
    if (BACKUP_STASH_REF) {
      const stashListResult = execGit(["stash", "list"]);
      if (stashListResult.stdout.includes("AGENT_BACKUP_PRE_MODIFICATION")) {
        execGit(["stash", "pop"]);
        console.log("[GIT] Restored stashed changes");
      }
      BACKUP_STASH_REF = null;
    }
    
    return {
      success: true,
      data: {
        restored: true,
        message: "All changes reverted. Repository is back to pre-modification state.",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_clear_backup
 * Clear the backup after successful build (no longer needed)
 */
function git_clear_backup() {
  console.log(`[TOOL:git_clear_backup] Clearing backup (build succeeded)`);
  
  try {
    // If we stashed changes, drop them since build succeeded
    if (BACKUP_STASH_REF) {
      const stashListResult = execGit(["stash", "list"]);
      if (stashListResult.stdout.includes("AGENT_BACKUP_PRE_MODIFICATION")) {
        // We don't drop the stash - the stashed changes were PRE-modification
        // They should be kept if the user wants them
        console.log("[GIT] Keeping pre-modification stash for reference");
      }
      BACKUP_STASH_REF = null;
    }
    
    return {
      success: true,
      data: {
        cleared: true,
        message: "Backup cleared. Changes are now permanent.",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: git_log
 * Get recent commit history
 */
function git_log(count = 5) {
  console.log(`[TOOL:git_log] count=${count}`);
  
  try {
    const result = execGit([
      "log", 
      `--oneline`, 
      `-n`, 
      String(count),
    ]);
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `git log failed: ${result.stderr}`,
      };
    }
    
    const commits = result.stdout.trim().split("\n").filter(Boolean).map((line) => {
      const [hash, ...messageParts] = line.split(" ");
      return { hash, message: messageParts.join(" ") };
    });
    
    return {
      success: true,
      data: { commits },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  initialize,
  git_clone,
  git_status,
  git_diff,
  git_add,
  git_commit,
  git_push,
  git_create_pr,
  git_stash_backup,
  git_restore_backup,
  git_clear_backup,
  git_log,
};
