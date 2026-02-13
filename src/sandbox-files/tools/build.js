/**
 * BUILD TOOLS
 * 
 * Build validation for portfolio maintenance agent.
 * These wrap common npm commands safely.
 */

const { spawnSync } = require("child_process");

let PROJECT_ROOT = "/vercel/sandbox";

/**
 * Initialize build tools with project root
 */
function initialize(root) {
  PROJECT_ROOT = root;
}

/**
 * Execute npm command safely
 */
function execNpm(args, options = {}) {
  console.log(`[BUILD] npm ${args.join(" ")}`);
  
  const result = spawnSync("npm", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    timeout: 120000, // 2 minute timeout for builds
    maxBuffer: 5 * 1024 * 1024, // 5MB for build output
    ...options,
  });
  
  const exitCode = result.status ?? -1;
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  
  return { exitCode, stdout, stderr };
}

/**
 * TOOL: npm_install
 * Install project dependencies (optimized for speed)
 */
function npm_install() {
  console.log(`[TOOL:npm_install]`);
  
  try {
    // Use npm ci for faster, cleaner installs when package-lock.json exists
    // --no-audit skips security audit (saves ~10s)
    // --no-fund skips funding messages
    // --prefer-offline uses cache when possible
    const fs = require("fs");
    const path = require("path");
    
    const hasLockFile = fs.existsSync(path.join(PROJECT_ROOT, "package-lock.json"));
    
    let result;
    if (hasLockFile) {
      // Fast path: use npm ci
      result = execNpm(["ci", "--no-audit", "--no-fund", "--prefer-offline"]);
    } else {
      // Fallback: npm install with optimizations
      result = execNpm(["install", "--no-audit", "--no-fund", "--prefer-offline"]);
    }
    
    if (result.exitCode !== 0) {
      return {
        success: false,
        error: `npm install failed`,
        data: {
          exitCode: result.exitCode,
          stderr: result.stderr,
          stdout: result.stdout,
        },
      };
    }
    
    return {
      success: true,
      data: {
        message: "Dependencies installed successfully",
        stdout: result.stdout.substring(0, 1000),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: run_build
 * Run npm build command (optimized with telemetry disabled)
 */
function run_build() {
  console.log(`[TOOL:run_build]`);
  
  try {
    // Disable Next.js telemetry for faster builds
    const result = execNpm(["run", "build"], {
      env: { 
        ...process.env, 
        NEXT_TELEMETRY_DISABLED: "1",
        CI: "true" // Enables CI mode optimizations
      }
    });
    
    const success = result.exitCode === 0;
    
    // Parse build errors if failed
    let errors = [];
    if (!success) {
      // Look for common error patterns
      const errorLines = (result.stderr + result.stdout)
        .split("\n")
        .filter((line) => 
          line.includes("Error:") || 
          line.includes("error ") ||
          line.includes("failed")
        );
      errors = errorLines.slice(0, 10);
    }
    
    return {
      success,
      data: {
        exitCode: result.exitCode,
        stdout: result.stdout.substring(0, 2000),
        stderr: result.stderr.substring(0, 2000),
        errors,
        summary: success ? "Build succeeded" : "Build failed",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: run_lint
 * Run linter if configured
 */
function run_lint() {
  console.log(`[TOOL:run_lint]`);
  
  try {
    const result = execNpm(["run", "lint"], { timeout: 60000 });
    
    return {
      success: result.exitCode === 0,
      data: {
        exitCode: result.exitCode,
        stdout: result.stdout.substring(0, 2000),
        stderr: result.stderr.substring(0, 2000),
        summary: result.exitCode === 0 ? "Lint passed" : "Lint failed",
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: check_build_output
 * Check build output directory exists and has content
 */
function check_build_output() {
  console.log(`[TOOL:check_build_output]`);
  
  const fs = require("fs");
  const path = require("path");
  
  try {
    // Common build output directories
    const buildDirs = [".next", "dist", "build", "out"];
    
    for (const dir of buildDirs) {
      const fullPath = path.join(PROJECT_ROOT, dir);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(fullPath);
          return {
            success: true,
            data: {
              build_dir: dir,
              file_count: files.length,
              files: files.slice(0, 10),
            },
          };
        }
      }
    }
    
    return {
      success: false,
      error: "No build output directory found",
      data: { checked: buildDirs },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  initialize,
  npm_install,
  run_build,
  run_lint,
  check_build_output,
};
