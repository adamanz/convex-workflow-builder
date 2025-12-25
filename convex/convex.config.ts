/**
 * Convex Configuration with Workflow Component
 *
 * This file configures the Convex application with the workflow component
 * from @convex-dev/workflow, enabling durable, long-running workflow execution.
 */
import workflow from "@convex-dev/workflow/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();

// Add the workflow component for durable workflow execution
app.use(workflow);

export default app;
