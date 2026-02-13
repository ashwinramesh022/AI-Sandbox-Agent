/**
 * FILESYSTEM TOOLS
 * 
 * Core file operations for the portfolio maintenance agent.
 * All paths are confined to the project root (sandbox or cloned repo).
 * 
 * SECURITY: Strict path sanitization prevents directory traversal attacks.
 */

const fs = require("fs");
const path = require("path");

// Will be set by initialize() - defaults to sandbox root
let PROJECT_ROOT = "/vercel/sandbox";

/**
 * Initialize filesystem tools with a project root
 */
function initialize(root) {
  PROJECT_ROOT = path.resolve(root); // Normalize the root path
  console.log(`[FILESYSTEM] Initialized with root: ${PROJECT_ROOT}`);
}

/**
 * Get the current project root
 */
function getRoot() {
  return PROJECT_ROOT;
}

/**
 * Validate and resolve a path to ensure it stays within project root
 * Prevents path traversal attacks (e.g., ../../../etc/passwd)
 * 
 * SECURITY CHECKS:
 * 1. Resolve to absolute path
 * 2. Verify path starts with PROJECT_ROOT
 * 3. Block null bytes (poison null byte attack)
 * 4. Block suspicious patterns
 */
function safePath(inputPath) {
  // Check for null bytes (security vulnerability)
  if (inputPath.includes('\0')) {
    return { valid: false, error: "Path contains null bytes (security violation)" };
  }
  
  // Block obviously malicious patterns
  const suspiciousPatterns = [
    /\.\.[/\\]/, // Parent directory traversal
    /^[/\\]/, // Absolute path (when we expect relative)
    /^~/, // Home directory expansion
    /\$\{/, // Variable expansion
    /\$\(/, // Command substitution
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(inputPath) && !inputPath.startsWith(PROJECT_ROOT)) {
      // Only block if it's not already an absolute path within root
      const testResolved = path.resolve(PROJECT_ROOT, inputPath);
      if (!testResolved.startsWith(PROJECT_ROOT + path.sep) && testResolved !== PROJECT_ROOT) {
        return { valid: false, error: `Suspicious path pattern detected: ${inputPath}` };
      }
    }
  }
  
  // Resolve to absolute path
  const resolved = path.resolve(PROJECT_ROOT, inputPath);
  
  // CRITICAL: Ensure resolved path is within PROJECT_ROOT
  // Use path.sep to ensure we match directory boundaries, not partial names
  // e.g., /project/src should not match /project/src-evil
  const normalizedRoot = PROJECT_ROOT.endsWith(path.sep) ? PROJECT_ROOT : PROJECT_ROOT + path.sep;
  const normalizedResolved = resolved.endsWith(path.sep) ? resolved : resolved + path.sep;
  
  // Path must either BE the root, or be INSIDE the root
  if (resolved !== PROJECT_ROOT && !normalizedResolved.startsWith(normalizedRoot)) {
    console.log(`[SECURITY] Path traversal blocked: "${inputPath}" resolved to "${resolved}"`);
    return { valid: false, error: `Path escapes project root: ${inputPath}` };
  }
  
  return { valid: true, path: resolved };
}

/**
 * TOOL: write_file
 * Writes content to a file within the project
 */
function write_file(filePath, content) {
  console.log(`[TOOL:write_file] path="${filePath}" content_length=${content.length}`);
  
  try {
    const safe = safePath(filePath);
    if (!safe.valid) {
      return { success: false, error: safe.error };
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(safe.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(safe.path, content, "utf8");
    
    const stats = fs.statSync(safe.path);
    return {
      success: true,
      data: {
        path: safe.path,
        relativePath: path.relative(PROJECT_ROOT, safe.path),
        bytes_written: stats.size,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: read_file
 * Reads content from a file within the project
 */
function read_file(filePath) {
  console.log(`[TOOL:read_file] path="${filePath}"`);
  
  try {
    const safe = safePath(filePath);
    if (!safe.valid) {
      return { success: false, error: safe.error };
    }
    
    if (!fs.existsSync(safe.path)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    
    const content = fs.readFileSync(safe.path, "utf8");
    const stats = fs.statSync(safe.path);
    
    return {
      success: true,
      data: {
        path: safe.path,
        relativePath: path.relative(PROJECT_ROOT, safe.path),
        content: content,
        size: stats.size,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: list_files
 * Lists contents of a directory within the project
 */
function list_files(dirPath = ".") {
  console.log(`[TOOL:list_files] dir="${dirPath}"`);
  
  try {
    const safe = safePath(dirPath);
    if (!safe.valid) {
      return { success: false, error: safe.error };
    }
    
    if (!fs.existsSync(safe.path)) {
      return { success: false, error: `Directory not found: ${dirPath}` };
    }
    
    const stats = fs.statSync(safe.path);
    if (!stats.isDirectory()) {
      return { success: false, error: `Not a directory: ${dirPath}` };
    }
    
    const entries = fs.readdirSync(safe.path, { withFileTypes: true });
    const files = entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "directory" : "file",
      path: path.relative(PROJECT_ROOT, path.join(safe.path, entry.name)),
    }));
    
    return {
      success: true,
      data: {
        directory: path.relative(PROJECT_ROOT, safe.path) || ".",
        entries: files,
        count: files.length,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * TOOL: search_files
 * Search for files matching a pattern or containing text
 */
function search_files(query, searchPath = ".") {
  console.log(`[TOOL:search_files] query="${query}" path="${searchPath}"`);
  
  try {
    const safe = safePath(searchPath);
    if (!safe.valid) {
      return { success: false, error: safe.error };
    }
    
    const results = [];
    
    function searchDir(dir) {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules and .git
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        
        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.isFile()) {
          // Check filename match
          if (entry.name.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              path: path.relative(PROJECT_ROOT, fullPath),
              match: "filename",
            });
          } else {
            // Check content match for text files
            try {
              const content = fs.readFileSync(fullPath, "utf8");
              if (content.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                  path: path.relative(PROJECT_ROOT, fullPath),
                  match: "content",
                });
              }
            } catch {
              // Skip binary files or unreadable files
            }
          }
        }
      }
    }
    
    searchDir(safe.path);
    
    return {
      success: true,
      data: {
        query,
        results: results.slice(0, 20), // Limit results
        count: results.length,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  initialize,
  getRoot,
  safePath,
  write_file,
  read_file,
  list_files,
  search_files,
};
