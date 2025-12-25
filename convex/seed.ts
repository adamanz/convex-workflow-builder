/**
 * Seed Data for Workflow Builder
 *
 * Provides a mutation to populate the database with built-in step templates.
 * These templates define the available node types for the workflow builder UI.
 */
import { mutation, query } from "./_generated/server";

/**
 * Step template definitions
 *
 * Each template includes:
 * - name: Display name for the node
 * - description: What this step does
 * - type: Node type matching schema validators
 * - icon: Lucide icon name for UI
 * - category: Grouping for the node palette
 * - configSchema: JSON Schema for configuration options
 * - defaultConfig: Sensible defaults for the step
 * - isBuiltIn: true for system templates
 */
const stepTemplates = [
  // ============= CORE NODES =============
  {
    name: "Start",
    description: "Entry point of the workflow. Receives initial input data.",
    type: "start" as const,
    icon: "Play",
    category: "core" as const,
    configSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          title: "Description",
          description: "Optional description of workflow inputs",
        },
      },
    },
    defaultConfig: {},
    isBuiltIn: true,
  },
  {
    name: "End",
    description: "Exit point of the workflow. Returns final output data.",
    type: "end" as const,
    icon: "Square",
    category: "core" as const,
    configSchema: {
      type: "object",
      properties: {
        outputMapping: {
          type: "string",
          title: "Output Mapping",
          description: "JSONPath expression to extract final output",
        },
      },
    },
    defaultConfig: {},
    isBuiltIn: true,
  },

  // ============= INTEGRATION NODES =============
  {
    name: "HTTP Request",
    description:
      "Make HTTP requests to external APIs. Supports GET, POST, PUT, DELETE, PATCH.",
    type: "http" as const,
    icon: "Globe",
    category: "integration" as const,
    configSchema: {
      type: "object",
      required: ["url", "method"],
      properties: {
        url: {
          type: "string",
          title: "URL",
          description: "The endpoint URL (supports template variables)",
        },
        method: {
          type: "string",
          title: "Method",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          default: "GET",
        },
        headers: {
          type: "object",
          title: "Headers",
          description: "HTTP headers as key-value pairs",
          additionalProperties: { type: "string" },
        },
        body: {
          type: "string",
          title: "Body",
          description: "Request body (for POST, PUT, PATCH)",
        },
        bodyType: {
          type: "string",
          title: "Body Type",
          enum: ["json", "form", "text", "none"],
          default: "json",
        },
        timeout: {
          type: "number",
          title: "Timeout (ms)",
          description: "Request timeout in milliseconds",
          default: 30000,
        },
        retryOnError: {
          type: "boolean",
          title: "Retry on Error",
          description: "Retry the request if it fails",
          default: true,
        },
        maxRetries: {
          type: "number",
          title: "Max Retries",
          description: "Maximum number of retry attempts",
          default: 3,
        },
      },
    },
    defaultConfig: {
      method: "GET",
      headers: {},
      bodyType: "json",
      timeout: 30000,
      retryOnError: true,
      maxRetries: 3,
    },
    isBuiltIn: true,
  },

  // ============= DATA NODES =============
  {
    name: "Transform",
    description:
      "Transform and map data between steps using JSONPath or JavaScript expressions.",
    type: "transform" as const,
    icon: "Shuffle",
    category: "data" as const,
    configSchema: {
      type: "object",
      required: ["transformType"],
      properties: {
        transformType: {
          type: "string",
          title: "Transform Type",
          enum: ["jsonpath", "javascript", "template"],
          default: "jsonpath",
        },
        expression: {
          type: "string",
          title: "Expression",
          description: "Transformation expression or code",
        },
        inputMapping: {
          type: "object",
          title: "Input Mapping",
          description: "Map input fields to variables",
          additionalProperties: { type: "string" },
        },
        outputMapping: {
          type: "object",
          title: "Output Mapping",
          description: "Map result to output fields",
          additionalProperties: { type: "string" },
        },
      },
    },
    defaultConfig: {
      transformType: "jsonpath",
      expression: "$.data",
      inputMapping: {},
      outputMapping: {},
    },
    isBuiltIn: true,
  },

  // ============= LOGIC NODES =============
  {
    name: "Condition",
    description:
      "Branch workflow based on conditions. Supports multiple condition types.",
    type: "condition" as const,
    icon: "GitBranch",
    category: "logic" as const,
    configSchema: {
      type: "object",
      required: ["conditionType"],
      properties: {
        conditionType: {
          type: "string",
          title: "Condition Type",
          enum: ["expression", "equals", "contains", "regex", "exists"],
          default: "expression",
        },
        leftOperand: {
          type: "string",
          title: "Left Operand",
          description: "First value to compare (JSONPath or literal)",
        },
        operator: {
          type: "string",
          title: "Operator",
          enum: ["==", "!=", ">", "<", ">=", "<=", "contains", "startsWith", "endsWith"],
          default: "==",
        },
        rightOperand: {
          type: "string",
          title: "Right Operand",
          description: "Second value to compare (JSONPath or literal)",
        },
        expression: {
          type: "string",
          title: "Expression",
          description: "JavaScript expression that returns boolean",
        },
      },
    },
    defaultConfig: {
      conditionType: "expression",
      operator: "==",
    },
    isBuiltIn: true,
  },
  {
    name: "Delay",
    description: "Pause workflow execution for a specified duration.",
    type: "delay" as const,
    icon: "Clock",
    category: "logic" as const,
    configSchema: {
      type: "object",
      required: ["delayType"],
      properties: {
        delayType: {
          type: "string",
          title: "Delay Type",
          enum: ["fixed", "until", "dynamic"],
          default: "fixed",
        },
        duration: {
          type: "number",
          title: "Duration (ms)",
          description: "Fixed delay duration in milliseconds",
          default: 1000,
        },
        durationUnit: {
          type: "string",
          title: "Unit",
          enum: ["ms", "seconds", "minutes", "hours", "days"],
          default: "seconds",
        },
        untilTime: {
          type: "string",
          title: "Until Time",
          description: "ISO timestamp or expression for 'until' type",
        },
        dynamicExpression: {
          type: "string",
          title: "Dynamic Expression",
          description: "Expression returning delay in ms for 'dynamic' type",
        },
      },
    },
    defaultConfig: {
      delayType: "fixed",
      duration: 5,
      durationUnit: "seconds",
    },
    isBuiltIn: true,
  },
  {
    name: "Parallel",
    description: "Execute multiple branches concurrently and merge results.",
    type: "parallel" as const,
    icon: "GitMerge",
    category: "logic" as const,
    configSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          title: "Execution Mode",
          enum: ["all", "race", "allSettled"],
          default: "all",
          description: "all: wait for all, race: first to complete, allSettled: complete all regardless of errors",
        },
        maxConcurrency: {
          type: "number",
          title: "Max Concurrency",
          description: "Maximum parallel executions (0 = unlimited)",
          default: 0,
        },
        timeout: {
          type: "number",
          title: "Timeout (ms)",
          description: "Maximum time to wait for all branches",
          default: 60000,
        },
        continueOnError: {
          type: "boolean",
          title: "Continue on Error",
          description: "Continue other branches if one fails",
          default: false,
        },
      },
    },
    defaultConfig: {
      mode: "all",
      maxConcurrency: 0,
      timeout: 60000,
      continueOnError: false,
    },
    isBuiltIn: true,
  },
  {
    name: "Loop",
    description: "Iterate over an array and execute steps for each item.",
    type: "loop" as const,
    icon: "Repeat",
    category: "logic" as const,
    configSchema: {
      type: "object",
      required: ["arrayPath"],
      properties: {
        arrayPath: {
          type: "string",
          title: "Array Path",
          description: "JSONPath to the array to iterate over",
        },
        itemVariable: {
          type: "string",
          title: "Item Variable",
          description: "Variable name for current item",
          default: "item",
        },
        indexVariable: {
          type: "string",
          title: "Index Variable",
          description: "Variable name for current index",
          default: "index",
        },
        mode: {
          type: "string",
          title: "Execution Mode",
          enum: ["sequential", "parallel"],
          default: "sequential",
        },
        maxConcurrency: {
          type: "number",
          title: "Max Concurrency",
          description: "Max parallel iterations (for parallel mode)",
          default: 5,
        },
        continueOnError: {
          type: "boolean",
          title: "Continue on Error",
          description: "Continue loop if an iteration fails",
          default: false,
        },
        maxIterations: {
          type: "number",
          title: "Max Iterations",
          description: "Safety limit for maximum iterations",
          default: 1000,
        },
      },
    },
    defaultConfig: {
      arrayPath: "$.items",
      itemVariable: "item",
      indexVariable: "index",
      mode: "sequential",
      maxConcurrency: 5,
      continueOnError: false,
      maxIterations: 1000,
    },
    isBuiltIn: true,
  },

  // ============= AI NODES =============
  {
    name: "AI",
    description:
      "Call AI/LLM APIs for text generation, analysis, or other AI tasks.",
    type: "ai" as const,
    icon: "Brain",
    category: "ai" as const,
    configSchema: {
      type: "object",
      required: ["provider", "model"],
      properties: {
        provider: {
          type: "string",
          title: "Provider",
          enum: ["openai", "anthropic", "google", "custom"],
          default: "openai",
        },
        model: {
          type: "string",
          title: "Model",
          description: "Model identifier (e.g., gpt-4, claude-3-opus)",
        },
        prompt: {
          type: "string",
          title: "Prompt",
          description: "System or user prompt template",
        },
        promptType: {
          type: "string",
          title: "Prompt Type",
          enum: ["system", "user", "template"],
          default: "user",
        },
        temperature: {
          type: "number",
          title: "Temperature",
          description: "Randomness of output (0-2)",
          default: 0.7,
          minimum: 0,
          maximum: 2,
        },
        maxTokens: {
          type: "number",
          title: "Max Tokens",
          description: "Maximum tokens in response",
          default: 1024,
        },
        responseFormat: {
          type: "string",
          title: "Response Format",
          enum: ["text", "json", "structured"],
          default: "text",
        },
        jsonSchema: {
          type: "object",
          title: "JSON Schema",
          description: "Schema for structured output (when format is 'structured')",
        },
        apiKeyEnvVar: {
          type: "string",
          title: "API Key Env Variable",
          description: "Environment variable name containing API key",
          default: "OPENAI_API_KEY",
        },
      },
    },
    defaultConfig: {
      provider: "openai",
      model: "gpt-4o-mini",
      promptType: "user",
      temperature: 0.7,
      maxTokens: 1024,
      responseFormat: "text",
      apiKeyEnvVar: "OPENAI_API_KEY",
    },
    isBuiltIn: true,
  },

  // ============= CONVEX FUNCTION NODES =============
  {
    name: "Action",
    description: "Execute a Convex action. Actions can have side effects and make external calls.",
    type: "action" as const,
    icon: "Zap",
    category: "integration" as const,
    configSchema: {
      type: "object",
      required: ["functionName"],
      properties: {
        functionName: {
          type: "string",
          title: "Function Name",
          description: "Full path to Convex action (e.g., 'myActions:sendEmail')",
        },
        args: {
          type: "object",
          title: "Arguments",
          description: "Arguments to pass to the action",
          additionalProperties: true,
        },
        argsMapping: {
          type: "object",
          title: "Arguments Mapping",
          description: "Map workflow data to action arguments",
          additionalProperties: { type: "string" },
        },
        timeout: {
          type: "number",
          title: "Timeout (ms)",
          description: "Maximum execution time",
          default: 30000,
        },
      },
    },
    defaultConfig: {
      args: {},
      argsMapping: {},
      timeout: 30000,
    },
    isBuiltIn: true,
  },
  {
    name: "Mutation",
    description: "Execute a Convex mutation to modify database state.",
    type: "mutation" as const,
    icon: "Database",
    category: "data" as const,
    configSchema: {
      type: "object",
      required: ["functionName"],
      properties: {
        functionName: {
          type: "string",
          title: "Function Name",
          description: "Full path to Convex mutation (e.g., 'users:create')",
        },
        args: {
          type: "object",
          title: "Arguments",
          description: "Arguments to pass to the mutation",
          additionalProperties: true,
        },
        argsMapping: {
          type: "object",
          title: "Arguments Mapping",
          description: "Map workflow data to mutation arguments",
          additionalProperties: { type: "string" },
        },
      },
    },
    defaultConfig: {
      args: {},
      argsMapping: {},
    },
    isBuiltIn: true,
  },
  {
    name: "Query",
    description: "Execute a Convex query to read database state.",
    type: "query" as const,
    icon: "Search",
    category: "data" as const,
    configSchema: {
      type: "object",
      required: ["functionName"],
      properties: {
        functionName: {
          type: "string",
          title: "Function Name",
          description: "Full path to Convex query (e.g., 'users:get')",
        },
        args: {
          type: "object",
          title: "Arguments",
          description: "Arguments to pass to the query",
          additionalProperties: true,
        },
        argsMapping: {
          type: "object",
          title: "Arguments Mapping",
          description: "Map workflow data to query arguments",
          additionalProperties: { type: "string" },
        },
        cacheResult: {
          type: "boolean",
          title: "Cache Result",
          description: "Cache query result for the workflow execution",
          default: false,
        },
      },
    },
    defaultConfig: {
      args: {},
      argsMapping: {},
      cacheResult: false,
    },
    isBuiltIn: true,
  },
];

/**
 * Seed the database with built-in step templates
 *
 * This mutation is idempotent - it will skip templates that already exist
 * based on name and type matching.
 *
 * @returns Object with counts of created, skipped, and total templates
 */
export const seedStepTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;

    for (const template of stepTemplates) {
      // Check if template already exists by name and type
      const existing = await ctx.db
        .query("stepTemplates")
        .withIndex("by_type", (q) => q.eq("type", template.type))
        .filter((q) => q.eq(q.field("name"), template.name))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Insert new template
      await ctx.db.insert("stepTemplates", template);
      created++;
    }

    return {
      created,
      skipped,
      total: stepTemplates.length,
    };
  },
});

/**
 * Clear all built-in step templates
 *
 * Useful for resetting and re-seeding templates.
 * Only removes templates marked as isBuiltIn: true.
 *
 * @returns Number of templates deleted
 */
export const clearBuiltInTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const builtInTemplates = await ctx.db
      .query("stepTemplates")
      .filter((q) => q.eq(q.field("isBuiltIn"), true))
      .collect();

    for (const template of builtInTemplates) {
      await ctx.db.delete(template._id);
    }

    return {
      deleted: builtInTemplates.length,
    };
  },
});

/**
 * Reset and reseed all built-in templates
 *
 * Combines clear and seed operations for a fresh start.
 *
 * @returns Combined results from clear and seed operations
 */
export const resetBuiltInTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing built-in templates
    const builtInTemplates = await ctx.db
      .query("stepTemplates")
      .filter((q) => q.eq(q.field("isBuiltIn"), true))
      .collect();

    for (const template of builtInTemplates) {
      await ctx.db.delete(template._id);
    }

    // Insert fresh templates
    let created = 0;
    for (const template of stepTemplates) {
      await ctx.db.insert("stepTemplates", template);
      created++;
    }

    return {
      deleted: builtInTemplates.length,
      created,
    };
  },
});

/**
 * Check if templates are seeded
 *
 * Query to check if the database has been seeded with templates.
 *
 * @returns Object with seeded status and template count
 */
export const checkSeeded = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("stepTemplates").collect();
    const builtInCount = templates.filter((t) => t.isBuiltIn).length;
    const customCount = templates.filter((t) => !t.isBuiltIn).length;

    return {
      seeded: builtInCount > 0,
      builtInCount,
      customCount,
      totalCount: templates.length,
      expectedBuiltInCount: stepTemplates.length,
      needsUpdate: builtInCount < stepTemplates.length,
    };
  },
});
