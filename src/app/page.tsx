"use client";

import { useState, useRef, useEffect } from "react";

/**
 * PORTFOLIO MAINTENANCE AGENT — UI
 * 
 * Features:
 * 1. Timeline View - Structured cards for each agent step
 * 2. Raw Log View - Toggle to see full stdout stream
 * 3. Sandbox Lifecycle Indicator - Status, ID, duration
 * 4. Real-time parsing of agent output into structured data
 * 5. Portfolio-specific task examples
 */

// ================================================================
// TYPES
// ================================================================

type SandboxStatus = "idle" | "creating" | "running" | "stopped" | "error";
type ViewMode = "timeline" | "raw";

interface AgentStep {
  stepNumber: number;
  tool: string;
  args: Record<string, unknown>;
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
  } | null;
  isRepair: boolean;
  timestamp: string;
}

interface SandboxInfo {
  id: string | null;
  status: SandboxStatus;
  startTime: number | null;
  endTime: number | null;
}

interface AgentSummary {
  stepsExecuted: number;
  maxSteps: number;
  errorsRepaired: number;
  completedNormally: boolean;
  finalResult: string | null;
}

// ================================================================
// LOG PARSER
// ================================================================

function parseLogLine(line: string, currentStep: number): Partial<{
  sandboxId: string;
  stepNumber: number;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  isRepair: boolean;
  isDone: boolean;
  doneResult: string;
  summary: Partial<AgentSummary>;
}> {
  // Extract sandbox ID
  const sandboxMatch = line.match(/Sandbox created: (sbx_[a-zA-Z0-9]+)/);
  if (sandboxMatch) {
    return { sandboxId: sandboxMatch[1] };
  }

  // Extract step number
  const stepMatch = line.match(/STEP (\d+)\/\d+/);
  if (stepMatch) {
    return { stepNumber: parseInt(stepMatch[1]) };
  }

  // Extract tool call
  const toolMatch = line.match(/\[LLM\] Tool call: (\w+)\((.+)\)/);
  if (toolMatch) {
    try {
      const args = JSON.parse(toolMatch[2]);
      return { tool: toolMatch[1], args };
    } catch {
      return { tool: toolMatch[1], args: {} };
    }
  }

  // Detect repair
  if (line.includes('[REPAIR]')) {
    return { isRepair: true };
  }

  // Detect done
  const doneMatch = line.match(/\[DONE\] Agent completed: (.+)/);
  if (doneMatch) {
    return { isDone: true, doneResult: doneMatch[1] };
  }

  // Extract summary values
  if (line.includes('Steps executed:')) {
    const match = line.match(/Steps executed: (\d+)/);
    if (match) return { summary: { stepsExecuted: parseInt(match[1]) } };
  }
  if (line.includes('Errors repaired:')) {
    const match = line.match(/Errors repaired: (\d+)/);
    if (match) return { summary: { errorsRepaired: parseInt(match[1]) } };
  }
  if (line.includes('Completed normally:')) {
    return { summary: { completedNormally: line.includes('true') } };
  }
  if (line.includes('Final result:')) {
    const match = line.match(/Final result: (.+)/);
    if (match) return { summary: { finalResult: match[1] } };
  }

  return {};
}

// ================================================================
// COMPONENTS
// ================================================================

function SandboxLifecycle({ info, duration }: { info: SandboxInfo; duration: number }) {
  const statusConfig: Record<SandboxStatus, { color: string; label: string; icon: string }> = {
    idle: { color: "#666", label: "Idle", icon: "⚪" },
    creating: { color: "#f59e0b", label: "Creating", icon: "🟡" },
    running: { color: "#22c55e", label: "Running", icon: "🟢" },
    stopped: { color: "#3b82f6", label: "Stopped", icon: "🔵" },
    error: { color: "#ef4444", label: "Error", icon: "🔴" },
  };

  const config = statusConfig[info.status];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "12px 16px",
      backgroundColor: "#1a1a1a",
      borderRadius: "8px",
      marginBottom: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>{config.icon}</span>
        <span style={{ color: config.color, fontWeight: 600 }}>{config.label}</span>
      </div>
      
      {info.id && (
        <div style={{ color: "#888", fontSize: "13px", fontFamily: "monospace" }}>
          {info.id}
        </div>
      )}
      
      {(info.status === "running" || info.status === "stopped") && (
        <div style={{ color: "#888", fontSize: "13px", marginLeft: "auto" }}>
          {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
        </div>
      )}
    </div>
  );
}

function StepCard({ step }: { step: AgentStep }) {
  const getStatusColor = () => {
    if (step.isRepair) return "#f59e0b";
    if (step.result?.success === false) return "#ef4444";
    return "#22c55e";
  };

  const formatArgs = (args: Record<string, unknown>) => {
    return Object.entries(args).map(([key, value]) => {
      const displayValue = typeof value === "string" 
        ? (value.length > 50 ? value.substring(0, 50) + "..." : value)
        : JSON.stringify(value);
      return `${key}: ${displayValue}`;
    }).join(", ");
  };

  return (
    <div style={{
      backgroundColor: "#1a1a1a",
      border: `1px solid ${getStatusColor()}33`,
      borderLeft: `3px solid ${getStatusColor()}`,
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            backgroundColor: getStatusColor(),
            color: "white",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: 600,
          }}>
            Step {step.stepNumber}
          </span>
          <span style={{ color: "#ededed", fontWeight: 500 }}>{step.tool}</span>
          {step.isRepair && (
            <span style={{ color: "#f59e0b", fontSize: "12px" }}>⚠️ Repair</span>
          )}
        </div>
        <span style={{ color: "#666", fontSize: "12px" }}>{step.timestamp}</span>
      </div>
      
      <div style={{
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#888",
        backgroundColor: "#111",
        padding: "8px 12px",
        borderRadius: "4px",
        overflowX: "auto",
      }}>
        {formatArgs(step.args)}
      </div>
      
      {step.result && (
        <div style={{
          marginTop: "8px",
          fontSize: "12px",
          color: step.result.success ? "#22c55e" : "#ef4444",
        }}>
          {step.result.success ? "✓ Success" : `✗ ${step.result.error || "Failed"}`}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ summary }: { summary: AgentSummary | null }) {
  if (!summary) return null;

  return (
    <div style={{
      backgroundColor: summary.completedNormally ? "#22c55e11" : "#ef444411",
      border: `1px solid ${summary.completedNormally ? "#22c55e33" : "#ef444433"}`,
      borderRadius: "8px",
      padding: "16px",
      marginTop: "16px",
    }}>
      <div style={{ fontWeight: 600, marginBottom: "12px", color: summary.completedNormally ? "#22c55e" : "#ef4444" }}>
        {summary.completedNormally ? "✓ Task Completed" : "✗ Task Incomplete"}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", fontSize: "13px" }}>
        <div>
          <div style={{ color: "#888" }}>Steps</div>
          <div style={{ fontWeight: 500 }}>{summary.stepsExecuted} / {summary.maxSteps}</div>
        </div>
        <div>
          <div style={{ color: "#888" }}>Repairs</div>
          <div style={{ fontWeight: 500, color: summary.errorsRepaired > 0 ? "#f59e0b" : "inherit" }}>
            {summary.errorsRepaired}
          </div>
        </div>
        <div>
          <div style={{ color: "#888" }}>Status</div>
          <div style={{ fontWeight: 500 }}>{summary.completedNormally ? "Done" : "Stopped"}</div>
        </div>
      </div>
      
      {summary.finalResult && (
        <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#11111180", borderRadius: "4px", fontSize: "13px" }}>
          <div style={{ color: "#888", marginBottom: "4px" }}>Result:</div>
          <div>{summary.finalResult}</div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// MAIN PAGE
// ================================================================

const DEFAULT_TASK = `Add a new project entry to my portfolio with title "AI Sandbox Agent" and description "A sandbox-native AI coding agent built with Next.js and Vercel Sandbox SDK".`;

const DEFAULT_REPO_URL = ""; // User provides their own repo URL

const EXAMPLE_TASKS = [
  {
    label: "Add new project",
    task: `Add a new project entry with title "Machine Learning Pipeline" and description "End-to-end ML pipeline for data processing and model training".`,
  },
  {
    label: "Update existing project",
    task: `Update the description of any project about AI or machine learning to include the phrase "Powered by GPT-4".`,
  },
  {
    label: "Add skills section",
    task: `Add a new skills section to the portfolio with TypeScript, React, and Python.`,
  },
  {
    label: "Fix build issues",
    task: `Run the build and fix any TypeScript or ESLint errors found.`,
  },
  {
    label: "Verify deployment",
    task: `Run the build, start the dev server, and verify the homepage loads correctly.`,
  },
];

export default function Home() {
  // State
  const [logs, setLogs] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [task, setTask] = useState<string>(DEFAULT_TASK);
  const [repoUrl, setRepoUrl] = useState<string>(DEFAULT_REPO_URL);
  const [sandboxInfo, setSandboxInfo] = useState<SandboxInfo>({
    id: null,
    status: "idle",
    startTime: null,
    endTime: null,
  });
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [duration, setDuration] = useState(0);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Duration timer
  useEffect(() => {
    if (sandboxInfo.status === "running" && sandboxInfo.startTime) {
      durationIntervalRef.current = setInterval(() => {
        setDuration(Date.now() - sandboxInfo.startTime!);
      }, 100);
    } else if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [sandboxInfo.status, sandboxInfo.startTime]);

  // Process logs into structured data
  const processLog = (line: string) => {
    const parsed = parseLogLine(line, currentStepRef.current);
    
    if (parsed.sandboxId) {
      setSandboxInfo(prev => ({ ...prev, id: parsed.sandboxId!, status: "running" }));
    }
    
    if (parsed.stepNumber) {
      currentStepRef.current = parsed.stepNumber;
    }
    
    if (parsed.tool) {
      const newStep: AgentStep = {
        stepNumber: currentStepRef.current,
        tool: parsed.tool,
        args: parsed.args || {},
        result: null,
        isRepair: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setSteps(prev => [...prev, newStep]);
    }
    
    if (parsed.isRepair) {
      setSteps(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].isRepair = true;
        }
        return updated;
      });
    }
    
    // Check for success/failure in result lines
    if (line.includes('"success": true')) {
      setSteps(prev => {
        const updated = [...prev];
        if (updated.length > 0 && !updated[updated.length - 1].result) {
          updated[updated.length - 1].result = { success: true };
        }
        return updated;
      });
    } else if (line.includes('"success": false')) {
      setSteps(prev => {
        const updated = [...prev];
        if (updated.length > 0 && !updated[updated.length - 1].result) {
          updated[updated.length - 1].result = { success: false };
        }
        return updated;
      });
    }
    
    if (parsed.summary) {
      setSummary(prev => ({ 
        stepsExecuted: 0, 
        maxSteps: 5, 
        errorsRepaired: 0, 
        completedNormally: false, 
        finalResult: null,
        ...prev, 
        ...parsed.summary 
      }));
    }
  };

  const runSandbox = async () => {
    // Reset state
    setLogs([]);
    setSteps([]);
    setSummary(null);
    currentStepRef.current = 0;
    setDuration(0);
    setSandboxInfo({
      id: null,
      status: "creating",
      startTime: Date.now(),
      endTime: null,
    });

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          task, 
          repoUrl: repoUrl || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());
        
        for (const line of lines) {
          setLogs((prev) => [...prev, line]);
          processLog(line);
        }

        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }

      setSandboxInfo(prev => ({
        ...prev,
        status: "stopped",
        endTime: Date.now(),
      }));

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setLogs((prev) => [...prev, `[ERROR] ${message}`]);
      setSandboxInfo(prev => ({ ...prev, status: "error" }));
    }
  };

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "8px" }}>Portfolio Maintenance Agent</h1>
      <p style={{ color: "#888", marginBottom: "8px" }}>
        AI-powered portfolio updates with sandbox isolation
      </p>
      <p style={{ color: "#666", fontSize: "12px", marginBottom: "20px" }}>
        ✨ Powered by <a href="https://openai.com" target="_blank" rel="noopener noreferrer" style={{ color: "#10a37f" }}>OpenAI GPT-4o</a> + <a href="https://sdk.vercel.ai/docs/ai-sdk-core/overview" target="_blank" rel="noopener noreferrer" style={{ color: "#0070f3" }}>Vercel Sandbox</a> 
      </p>

      {/* Repository URL input */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", color: "#888" }}>
          GitHub Repository URL:
        </label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          disabled={sandboxInfo.status === "running" || sandboxInfo.status === "creating"}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            color: "white",
            fontFamily: "monospace",
            fontSize: "14px",
            opacity: sandboxInfo.status === "running" ? 0.5 : 1,
          }}
          placeholder="https://github.com/username/portfolio-repo.git"
        />
        
      </div>

      {/* Task input */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", color: "#888" }}>
          Portfolio Goal:
        </label>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          disabled={sandboxInfo.status === "running" || sandboxInfo.status === "creating"}
          style={{
            width: "100%",
            height: "80px",
            padding: "12px",
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            color: "white",
            fontFamily: "sans-serif",
            fontSize: "14px",
            resize: "vertical",
            opacity: sandboxInfo.status === "running" ? 0.5 : 1,
          }}
          placeholder="Enter what you want to change in your portfolio..."
        />
      </div>

      {/* Example tasks */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", color: "#666", fontSize: "12px" }}>
          Quick Examples:
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {EXAMPLE_TASKS.map((example, i) => (
            <button
              key={i}
              onClick={() => setTask(example.task)}
              disabled={sandboxInfo.status === "running" || sandboxInfo.status === "creating"}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                backgroundColor: "#222",
                color: "#888",
                border: "1px solid #333",
                borderRadius: "4px",
                cursor: sandboxInfo.status === "running" ? "not-allowed" : "pointer",
              }}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runSandbox}
        disabled={sandboxInfo.status === "running" || sandboxInfo.status === "creating"}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: sandboxInfo.status === "running" || sandboxInfo.status === "creating" ? "#333" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: sandboxInfo.status === "running" || sandboxInfo.status === "creating" ? "not-allowed" : "pointer",
          marginBottom: "20px",
        }}
      >
        {sandboxInfo.status === "creating" ? "Creating Sandbox..." : 
         sandboxInfo.status === "running" ? "Updating Portfolio..." : 
         "Run Agent"}
      </button>

      {/* Sandbox lifecycle indicator */}
      <SandboxLifecycle info={sandboxInfo} duration={duration} />

      {/* View mode toggle */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={() => setViewMode("timeline")}
          style={{
            padding: "8px 16px",
            backgroundColor: viewMode === "timeline" ? "#2563eb" : "#333",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          📊 Timeline
        </button>
        <button
          onClick={() => setViewMode("raw")}
          style={{
            padding: "8px 16px",
            backgroundColor: viewMode === "raw" ? "#2563eb" : "#333",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          📜 Raw Logs
        </button>
      </div>

      {/* Main content area */}
      {viewMode === "timeline" ? (
        <div style={{ minHeight: "400px" }}>
          {steps.length === 0 && sandboxInfo.status === "idle" && (
            <div style={{
              padding: "40px",
              textAlign: "center",
              color: "#555",
              backgroundColor: "#111",
              borderRadius: "8px",
            }}>
              Enter a goal and click &quot;Run Agent&quot; to start
            </div>
          )}
          
          {steps.length === 0 && (sandboxInfo.status === "creating" || sandboxInfo.status === "running") && (
            <div style={{
              padding: "40px",
              textAlign: "center",
              color: "#888",
              backgroundColor: "#111",
              borderRadius: "8px",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
              Waiting for agent steps...
            </div>
          )}

          {steps.map((step, i) => (
            <StepCard key={i} step={step} />
          ))}

          <SummaryCard summary={summary} />
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#111",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "16px",
            height: "400px",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.5",
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: "#555" }}>Logs will appear here...</span>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                style={{
                  color: log.startsWith("[ERROR]") || log.includes("FAILED")
                    ? "#ef4444"
                    : log.includes("[REPAIR]")
                    ? "#f59e0b"
                    : log.startsWith("[LIFECYCLE]")
                    ? "#3b82f6"
                    : log.includes("[LLM]")
                    ? "#a855f7"
                    : log.includes("[DONE]") || log.includes("COMPLETE")
                    ? "#22c55e"
                    : "#888",
                }}
              >
                {log}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Architecture note */}
      <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#1a1a1a", borderRadius: "8px", fontSize: "13px" }}>
        <strong>How It Works:</strong>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", color: "#888" }}>
          <li><strong>Sandbox Isolation:</strong> Agent runs in ephemeral Vercel Sandbox (Firecracker MicroVM)</li>
          <li><strong>Portfolio Loading:</strong> Clones or initializes portfolio codebase</li>
          <li><strong>Modification:</strong> Makes changes based on your goal using AI</li>
          <li><strong>Build Validation:</strong> Runs <code>npm run build</code> and fixes errors</li>
          <li><strong>Git Integration:</strong> Optional commit and push of changes</li>
        </ul>
      </div>
    </main>
  );
}
