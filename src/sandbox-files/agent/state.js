/**
 * STATE MANAGEMENT
 * 
 * Tracks agent state across loop iterations.
 * Persisted in memory during agent run.
 */

/**
 * Agent state structure
 */
const initialState = {
  // User goal
  goal: null,
  
  // Repository info
  repo: {
    url: null,
    path: null,
    initialized: false,
  },
  
  // Files modified in this session
  changed_files: [],
  
  // Build status
  build: {
    ran: false,
    success: null,
    errors: [],
    output: null,
  },
  
  // Dev server status
  dev_server: {
    running: false,
    port: null,
    pid: null,
  },
  
  // Verification status
  verification: {
    ran: false,
    success: null,
    checks: [],
  },
  
  // Git status
  git: {
    committed: false,
    pushed: false,
    commit_hash: null,
    branch: null,
    pr_url: null,
  },
  
  // Loop tracking
  iteration: {
    count: 0,
    max: 10,
    errors: [],
    repairs: 0,
  },
  
  // Plan
  plan: {
    steps: [],
    current_step: 0,
  },
};

// Current state (cloned from initial)
let state = JSON.parse(JSON.stringify(initialState));

/**
 * Reset state to initial values
 */
function reset() {
  state = JSON.parse(JSON.stringify(initialState));
  return state;
}

/**
 * Get current state
 */
function get() {
  return state;
}

/**
 * Update state with partial values
 */
function update(partial) {
  state = deepMerge(state, partial);
  return state;
}

/**
 * Set the user goal
 */
function setGoal(goal) {
  state.goal = goal;
  return state;
}

/**
 * Mark repository as initialized
 */
function setRepoInitialized(url, path) {
  state.repo = {
    url,
    path,
    initialized: true,
  };
  return state;
}

/**
 * Add a changed file
 */
function addChangedFile(filePath) {
  if (!state.changed_files.includes(filePath)) {
    state.changed_files.push(filePath);
  }
  return state;
}

/**
 * Update build status
 */
function setBuildStatus(success, errors = [], output = null) {
  state.build = {
    ran: true,
    success,
    errors,
    output,
  };
  return state;
}

/**
 * Update dev server status
 */
function setDevServerStatus(running, port = null, pid = null) {
  state.dev_server = {
    running,
    port,
    pid,
  };
  return state;
}

/**
 * Update verification status
 */
function setVerificationStatus(success, checks = []) {
  state.verification = {
    ran: true,
    success,
    checks,
  };
  return state;
}

/**
 * Update git status
 */
function setGitStatus(committed, pushed, commitHash = null, branch = null, prUrl = null) {
  state.git = {
    committed,
    pushed,
    commit_hash: commitHash,
    branch: branch || state.git.branch,
    pr_url: prUrl || state.git.pr_url,
  };
  return state;
}

/**
 * Increment iteration count
 */
function incrementIteration() {
  state.iteration.count++;
  return state;
}

/**
 * Add error to iteration tracking
 */
function addIterationError(error) {
  state.iteration.errors.push(error);
  state.iteration.repairs++;
  return state;
}

/**
 * Set plan steps
 */
function setPlan(steps) {
  state.plan = {
    steps,
    current_step: 0,
  };
  return state;
}

/**
 * Advance to next plan step
 */
function advancePlanStep() {
  state.plan.current_step++;
  return state;
}

/**
 * Check if agent should terminate
 */
function shouldTerminate() {
  // Max iterations reached
  if (state.iteration.count >= state.iteration.max) {
    return { terminate: true, reason: "Max iterations reached" };
  }
  
  // Build succeeded and verification passed
  if (state.build.success && state.verification.success) {
    return { terminate: true, reason: "Task completed successfully" };
  }
  
  return { terminate: false };
}

/**
 * Get state summary for logging
 */
function getSummary() {
  return {
    goal: state.goal ? state.goal.substring(0, 50) + "..." : null,
    iteration: `${state.iteration.count}/${state.iteration.max}`,
    files_changed: state.changed_files.length,
    build: state.build.success === null ? "not run" : state.build.success ? "✓" : "✗",
    verification: state.verification.success === null ? "not run" : state.verification.success ? "✓" : "✗",
    git: state.git.committed ? (state.git.pushed ? "pushed" : "committed") : "uncommitted",
    repairs: state.iteration.repairs,
  };
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

module.exports = {
  reset,
  get,
  update,
  setGoal,
  setRepoInitialized,
  addChangedFile,
  setBuildStatus,
  setDevServerStatus,
  setVerificationStatus,
  setGitStatus,
  incrementIteration,
  addIterationError,
  setPlan,
  advancePlanStep,
  shouldTerminate,
  getSummary,
};
