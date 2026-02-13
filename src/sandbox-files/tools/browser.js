/**
 * BROWSER TOOLS (Lightweight - No Puppeteer)
 * 
 * Simple HTTP-based URL verification without Puppeteer overhead.
 * Build success is the primary verification method.
 */

// ================================================================
// STATE
// ================================================================

let PROJECT_ROOT = process.cwd();

// ================================================================
// INITIALIZATION
// ================================================================

function initialize(projectRoot) {
  PROJECT_ROOT = projectRoot || process.cwd();
  console.log(`[BROWSER] Initialized with root: ${PROJECT_ROOT}`);
}

// ================================================================
// TOOL FUNCTIONS
// ================================================================

/**
 * Verify a URL is accessible (lightweight HTTP check)
 */
async function verify_url(args) {
  const { url, expectedContent, timeout = 10000 } = args;
  
  if (!url) {
    return { success: false, error: "url is required" };
  }
  
  console.log(`[TOOL:verify_url] url="${url}"`);
  
  try {
    const http = url.startsWith("https") ? require("https") : require("http");
    
    const { statusCode, body } = await new Promise((resolve, reject) => {
      const req = http.get(url, { timeout }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      });
      req.on("error", reject);
      req.on("timeout", () => reject(new Error("Request timeout")));
    });
    
    // Check for expected content if provided
    let contentMatch = true;
    if (expectedContent) {
      contentMatch = body.includes(expectedContent);
    }
    
    return {
      success: true,
      data: {
        url,
        statusCode,
        accessible: statusCode >= 200 && statusCode < 400,
        contentMatch,
        bodyLength: body.length,
        hasExpectedContent: expectedContent ? contentMatch : "not checked"
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ================================================================
// EXPORTS
// ================================================================

module.exports = {
  initialize,
  verify_url
};
