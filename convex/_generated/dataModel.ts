/* eslint-disable */
/**
 * Generated data model types - these will be replaced by `npx convex dev`
 */
import type { GenericId } from "convex/values";

export type TableNames = "workflows" | "executions" | "executionLogs" | "stepTemplates";

export type Id<TableName extends TableNames> = GenericId<TableName>;
