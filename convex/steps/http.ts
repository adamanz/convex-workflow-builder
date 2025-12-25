/**
 * HTTP Request Step Implementation
 *
 * Executes HTTP requests as part of workflow execution.
 * Supports GET, POST, PUT, PATCH, DELETE methods with
 * configurable headers and body.
 */
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Execute an HTTP request
 *
 * @param url - The URL to request
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param headers - Optional headers object
 * @param body - Optional request body (for POST, PUT, PATCH)
 * @returns Response data
 */
export const executeHttpRequest = internalAction({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.string(),
    config: v.object({
      url: v.string(),
      method: v.string(),
      headers: v.optional(v.any()),
      body: v.optional(v.string()),
      timeout: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { url, method, headers, body, timeout } = args.config;
    const startTime = Date.now();

    // Log request start
    await ctx.runMutation(internal.executions.addExecutionLog, {
      executionId: args.executionId,
      nodeId: args.nodeId,
      level: "debug",
      message: `Starting HTTP ${method} request to ${url}`,
      data: { headers, hasBody: !!body },
    });

    try {
      // Build fetch options
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          ...((headers as Record<string, string>) || {}),
        },
      };

      // Add body for methods that support it
      if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
        fetchOptions.body = body;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutMs = timeout || 30000; // Default 30 second timeout
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      fetchOptions.signal = controller.signal;

      // Execute the request
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // Parse response
      let responseData: unknown;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Build result object - extract headers manually for compatibility
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        duration,
        ok: response.ok,
      };

      // Log success
      await ctx.runMutation(internal.executions.addExecutionLog, {
        executionId: args.executionId,
        nodeId: args.nodeId,
        level: response.ok ? "info" : "warn",
        message: `HTTP ${method} ${url} completed with status ${response.status}`,
        data: { status: response.status, duration },
      });

      // Throw if response indicates error
      if (!response.ok) {
        throw new Error(
          `HTTP request failed: ${response.status} ${response.statusText}`
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Log error
      await ctx.runMutation(internal.executions.addExecutionLog, {
        executionId: args.executionId,
        nodeId: args.nodeId,
        level: "error",
        message: `HTTP ${method} ${url} failed: ${errorMessage}`,
        data: { error: errorMessage, duration },
      });

      // Check if it's a timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`HTTP request timed out after ${timeout || 30000}ms`);
      }

      throw error;
    }
  },
});

/**
 * Validate URL format
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * HTTP step configuration schema for the UI
 */
export const httpConfigSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
      title: "URL",
      description: "The URL to make the request to",
    },
    method: {
      type: "string",
      title: "Method",
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      default: "GET",
    },
    headers: {
      type: "object",
      title: "Headers",
      description: "HTTP headers to include",
      additionalProperties: { type: "string" },
    },
    body: {
      type: "object",
      title: "Body",
      description: "Request body (for POST, PUT, PATCH)",
    },
    timeout: {
      type: "number",
      title: "Timeout (ms)",
      description: "Request timeout in milliseconds",
      default: 30000,
    },
  },
  required: ["url", "method"],
};

/**
 * Default configuration for HTTP step
 */
export const httpDefaultConfig = {
  url: "",
  method: "GET",
  headers: {},
  body: null,
  timeout: 30000,
};
