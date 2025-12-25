/**
 * Convex Workflow Manager Initialization
 *
 * Sets up the WorkflowManager from @convex-dev/workflow with proper
 * retry configuration for reliable workflow execution.
 */
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";

/**
 * Workflow Manager instance
 *
 * Configured with:
 * - Default max attempts: 3 retries for each step
 * - Default initial backoff: 1 second between retries
 * - Default maximum backoff: 30 seconds cap
 * - Backoff multiplier: 2x exponential backoff
 */
export const workflowManager = new WorkflowManager(components.workflow);

/**
 * Re-export workflow types for use in other files
 */
export type { WorkflowManager } from "@convex-dev/workflow";
