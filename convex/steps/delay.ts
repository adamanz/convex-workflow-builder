/**
 * Delay Step Implementation
 *
 * Implements delays/waits as part of workflow execution.
 * Supports duration in milliseconds with proper sleep implementation.
 * Uses workflow-aware sleep for durable execution.
 */
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Time unit for human-readable delay configuration
 */
type TimeUnit = "milliseconds" | "seconds" | "minutes" | "hours" | "days";

/**
 * Convert duration to milliseconds based on time unit
 */
function toMilliseconds(value: number, unit: TimeUnit): number {
  switch (unit) {
    case "milliseconds":
      return value;
    case "seconds":
      return value * 1000;
    case "minutes":
      return value * 60 * 1000;
    case "hours":
      return value * 60 * 60 * 1000;
    case "days":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return ms + "ms";
  }
  if (ms < 60000) {
    return (ms / 1000).toFixed(1) + "s";
  }
  if (ms < 3600000) {
    return (ms / 60000).toFixed(1) + "min";
  }
  if (ms < 86400000) {
    return (ms / 3600000).toFixed(1) + "hr";
  }
  return (ms / 86400000).toFixed(1) + "days";
}

/**
 * Execute a delay/wait operation
 *
 * This action implements a delay in workflow execution.
 * For short delays (< 5 seconds), it uses a simple setTimeout.
 * For longer delays, it's recommended to use scheduled execution
 * at the workflow level for better resource management.
 *
 * @param durationMs - Duration to wait in milliseconds
 * @param unit - Optional time unit if value is provided instead
 * @param value - Duration value (used with unit)
 * @returns Delay completion info
 */
export const executeDelay = internalAction({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.string(),
    config: v.object({
      durationMs: v.optional(v.number()),
      value: v.optional(v.number()),
      unit: v.optional(v.string()),
      reason: v.optional(v.string()), // Optional reason for the delay
    }),
  },
  handler: async (ctx, args) => {
    const { durationMs, value, unit, reason } = args.config;
    const startTime = Date.now();

    // Calculate duration in milliseconds
    let duration: number;
    if (durationMs !== undefined) {
      duration = durationMs;
    } else if (value !== undefined && unit) {
      duration = toMilliseconds(value, unit as TimeUnit);
    } else {
      throw new Error("Either durationMs or value+unit must be provided");
    }

    // Validate duration
    if (duration < 0) {
      throw new Error("Delay duration cannot be negative");
    }

    // Maximum delay of 1 hour for action-based delays
    // Longer delays should use scheduled execution
    const MAX_DELAY_MS = 60 * 60 * 1000; // 1 hour
    if (duration > MAX_DELAY_MS) {
      throw new Error(
        "Delay of " + formatDuration(duration) + " exceeds maximum of 1 hour. " +
        "For longer delays, use scheduled execution."
      );
    }

    // Log delay start
    const logMessage = reason
      ? "Starting delay of " + formatDuration(duration) + ": " + reason
      : "Starting delay of " + formatDuration(duration);
      
    await ctx.runMutation(internal.executions.addExecutionLog, {
      executionId: args.executionId,
      nodeId: args.nodeId,
      level: "info",
      message: logMessage,
      data: { durationMs: duration, reason },
    });

    try {
      // Execute the delay
      await sleep(duration);

      const actualDuration = Date.now() - startTime;

      // Log completion
      await ctx.runMutation(internal.executions.addExecutionLog, {
        executionId: args.executionId,
        nodeId: args.nodeId,
        level: "info",
        message: "Delay completed after " + formatDuration(actualDuration),
        data: {
          requestedDurationMs: duration,
          actualDurationMs: actualDuration,
        },
      });

      return {
        delayed: true,
        requestedDurationMs: duration,
        actualDurationMs: actualDuration,
        startTime,
        endTime: Date.now(),
        reason,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Log error
      await ctx.runMutation(internal.executions.addExecutionLog, {
        executionId: args.executionId,
        nodeId: args.nodeId,
        level: "error",
        message: "Delay failed: " + errorMessage,
        data: { error: errorMessage, elapsedMs: Date.now() - startTime },
      });

      throw error;
    }
  },
});

/**
 * Sleep for a specified duration
 *
 * This is a simple Promise-based sleep function.
 * For workflow durability, the workflow manager handles
 * resumption after longer delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });
}

/**
 * Calculate a delay until a specific time
 *
 * Utility function for time-based delays (e.g., "wait until 9am")
 */
export function calculateDelayUntil(targetTime: Date): number {
  const now = Date.now();
  const target = targetTime.getTime();
  return Math.max(0, target - now);
}

/**
 * Parse a time string into milliseconds
 *
 * Supports formats like:
 * - "1s", "1sec", "1 second"
 * - "5m", "5min", "5 minutes"
 * - "2h", "2hr", "2 hours"
 * - "1d", "1 day"
 * - "1500" (milliseconds)
 */
export function parseTimeString(timeStr: string): number {
  const trimmed = timeStr.trim().toLowerCase();

  // Pure number = milliseconds
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Parse value and unit
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) {
    throw new Error("Invalid time string: " + timeStr);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "ms";

  // Map common unit names
  const unitMap: Record<string, TimeUnit> = {
    ms: "milliseconds",
    millisecond: "milliseconds",
    milliseconds: "milliseconds",
    s: "seconds",
    sec: "seconds",
    second: "seconds",
    seconds: "seconds",
    m: "minutes",
    min: "minutes",
    minute: "minutes",
    minutes: "minutes",
    h: "hours",
    hr: "hours",
    hour: "hours",
    hours: "hours",
    d: "days",
    day: "days",
    days: "days",
  };

  const normalizedUnit = unitMap[unit];
  if (!normalizedUnit) {
    throw new Error("Unknown time unit: " + unit);
  }

  return toMilliseconds(value, normalizedUnit);
}

/**
 * Delay step configuration schema for the UI
 */
export const delayConfigSchema = {
  type: "object",
  properties: {
    durationMs: {
      type: "number",
      title: "Duration (ms)",
      description: "Delay duration in milliseconds",
    },
    value: {
      type: "number",
      title: "Duration Value",
      description: "Duration value (used with unit)",
    },
    unit: {
      type: "string",
      title: "Duration Unit",
      enum: ["milliseconds", "seconds", "minutes", "hours", "days"],
      default: "seconds",
    },
    reason: {
      type: "string",
      title: "Reason",
      description: "Optional reason for the delay (for logging)",
    },
  },
  oneOf: [
    { required: ["durationMs"] },
    { required: ["value", "unit"] },
  ],
};

/**
 * Default configuration for delay step
 */
export const delayDefaultConfig = {
  value: 5,
  unit: "seconds",
  reason: "",
};

/**
 * Common delay presets for UI
 */
export const delayPresets = [
  { label: "1 second", value: 1, unit: "seconds" as TimeUnit },
  { label: "5 seconds", value: 5, unit: "seconds" as TimeUnit },
  { label: "30 seconds", value: 30, unit: "seconds" as TimeUnit },
  { label: "1 minute", value: 1, unit: "minutes" as TimeUnit },
  { label: "5 minutes", value: 5, unit: "minutes" as TimeUnit },
  { label: "15 minutes", value: 15, unit: "minutes" as TimeUnit },
  { label: "30 minutes", value: 30, unit: "minutes" as TimeUnit },
  { label: "1 hour", value: 1, unit: "hours" as TimeUnit },
];
