/**
 * Data Transformation Step Implementation
 *
 * Executes data transformations as part of workflow execution.
 * Supports JavaScript-like expressions for mapping, filtering,
 * and transforming data with safe evaluation (no eval).
 */
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Supported transformation operations
 */
type TransformOperation =
  | "map"
  | "filter"
  | "reduce"
  | "pick"
  | "omit"
  | "merge"
  | "flatten"
  | "get"
  | "set"
  | "template"
  | "custom";

/**
 * Execute a data transformation
 *
 * @param expression - Transformation expression or operation config
 * @param inputData - Input data to transform
 * @returns Transformed data
 */
export const executeTransform = internalAction({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.string(),
    config: v.object({
      expression: v.string(),
      inputData: v.any(),
      operation: v.optional(v.string()),
      operationConfig: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const { expression, inputData, operation, operationConfig } = args.config;
    const startTime = Date.now();

    // Log transformation start
    await ctx.runMutation(internal.executions.addExecutionLog, {
      executionId: args.executionId,
      nodeId: args.nodeId,
      level: "debug",
      message: `Starting data transformation`,
      data: { expression, operation },
    });

    try {
      let result: unknown;

      // If operation is specified, use predefined operations
      if (operation) {
        result = executeOperation(
          operation as TransformOperation,
          inputData,
          operationConfig || {}
        );
      } else {
        // Parse and execute the expression safely
        result = safeEvaluateExpression(expression, inputData);
      }

      const duration = Date.now() - startTime;

      // Log success
      await ctx.runMutation(internal.executions.addExecutionLog, {
        executionId: args.executionId,
        nodeId: args.nodeId,
        level: "info",
        message: `Data transformation completed successfully`,
        data: { duration, resultType: typeof result },
      });

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
        message: `Data transformation failed: ${errorMessage}`,
        data: { error: errorMessage, duration },
      });

      throw error;
    }
  },
});

/**
 * Execute a predefined transformation operation
 */
function executeOperation(
  operation: TransformOperation,
  data: unknown,
  config: Record<string, unknown>
): unknown {
  switch (operation) {
    case "map": {
      // Map over array with field extraction or transformation
      if (!Array.isArray(data)) {
        throw new Error("Map operation requires an array input");
      }
      const field = config.field as string | undefined;
      const expression = config.expression as string | undefined;

      if (field) {
        return data.map((item) => getNestedValue(item, field));
      }
      if (expression) {
        return data.map((item) => safeEvaluateExpression(expression, { item, data }));
      }
      return data;
    }

    case "filter": {
      // Filter array based on condition
      if (!Array.isArray(data)) {
        throw new Error("Filter operation requires an array input");
      }
      const condition = config.condition as string;
      if (!condition) {
        throw new Error("Filter operation requires a condition");
      }
      return data.filter((item, index) =>
        safeEvaluateCondition(condition, { item, index, data })
      );
    }

    case "reduce": {
      // Reduce array to single value
      if (!Array.isArray(data)) {
        throw new Error("Reduce operation requires an array input");
      }
      const reducer = config.reducer as string;
      const initialValue = config.initialValue;

      if (reducer === "sum") {
        return data.reduce(
          (sum: number, item) =>
            sum + (typeof item === "number" ? item : Number(item) || 0),
          (initialValue as number) ?? 0
        );
      }
      if (reducer === "count") {
        return data.length;
      }
      if (reducer === "concat") {
        return data.join(config.separator as string ?? "");
      }
      if (reducer === "first") {
        return data[0];
      }
      if (reducer === "last") {
        return data[data.length - 1];
      }
      return data;
    }

    case "pick": {
      // Pick specific fields from object
      if (typeof data !== "object" || data === null) {
        throw new Error("Pick operation requires an object input");
      }
      const fields = config.fields as string[];
      if (!Array.isArray(fields)) {
        throw new Error("Pick operation requires fields array");
      }
      const result: Record<string, unknown> = {};
      for (const field of fields) {
        result[field] = (data as Record<string, unknown>)[field];
      }
      return result;
    }

    case "omit": {
      // Omit specific fields from object
      if (typeof data !== "object" || data === null) {
        throw new Error("Omit operation requires an object input");
      }
      const fieldsToOmit = config.fields as string[];
      if (!Array.isArray(fieldsToOmit)) {
        throw new Error("Omit operation requires fields array");
      }
      const result: Record<string, unknown> = { ...(data as Record<string, unknown>) };
      for (const field of fieldsToOmit) {
        delete result[field];
      }
      return result;
    }

    case "merge": {
      // Merge multiple objects
      if (typeof data !== "object" || data === null) {
        throw new Error("Merge operation requires an object input");
      }
      const mergeWith = config.with as Record<string, unknown>;
      return { ...(data as Record<string, unknown>), ...mergeWith };
    }

    case "flatten": {
      // Flatten nested array
      if (!Array.isArray(data)) {
        throw new Error("Flatten operation requires an array input");
      }
      const depth = (config.depth as number) ?? 1;
      return data.flat(depth);
    }

    case "get": {
      // Get nested value using path
      const path = config.path as string;
      if (!path) {
        throw new Error("Get operation requires a path");
      }
      return getNestedValue(data, path);
    }

    case "set": {
      // Set nested value using path
      const path = config.path as string;
      const value = config.value;
      if (!path) {
        throw new Error("Set operation requires a path");
      }
      if (typeof data !== "object" || data === null) {
        throw new Error("Set operation requires an object input");
      }
      return setNestedValue({ ...(data as Record<string, unknown>) }, path, value);
    }

    case "template": {
      // Apply template string
      const templateStr = config.template as string;
      if (!templateStr) {
        throw new Error("Template operation requires a template string");
      }
      return applyTemplate(templateStr, data as Record<string, unknown>);
    }

    case "custom": {
      // Custom expression evaluation
      const expr = config.expression as string;
      if (!expr) {
        throw new Error("Custom operation requires an expression");
      }
      return safeEvaluateExpression(expr, data);
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Safely evaluate a JavaScript-like expression without using eval
 *
 * Supports:
 * - Property access: data.property, data['property'], data.nested.path
 * - Array indexing: data[0], data.items[1]
 * - Comparisons: ==, !=, <, >, <=, >=
 * - Arithmetic: +, -, *, /, %
 * - Ternary: condition ? true : false
 * - Logical: &&, ||, !
 */
function safeEvaluateExpression(
  expression: string,
  context: unknown
): unknown {
  const trimmed = expression.trim();

  // Handle literal values
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^["'].*["']$/.test(trimmed)) return trimmed.slice(1, -1);

  // Handle JSON object/array literals
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      // Replace variable references with actual values
      const resolved = resolveVariablesInJson(trimmed, context as Record<string, unknown>);
      return JSON.parse(resolved);
    } catch {
      // Not valid JSON, continue with expression parsing
    }
  }

  // Handle ternary expressions
  const ternaryMatch = trimmed.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
  if (ternaryMatch) {
    const [, condition, trueExpr, falseExpr] = ternaryMatch;
    const conditionResult = safeEvaluateCondition(condition, context);
    return conditionResult
      ? safeEvaluateExpression(trueExpr, context)
      : safeEvaluateExpression(falseExpr, context);
  }

  // Handle logical OR
  if (trimmed.includes("||")) {
    const parts = splitLogicalOperator(trimmed, "||");
    for (const part of parts) {
      const result = safeEvaluateExpression(part, context);
      if (result) return result;
    }
    return false;
  }

  // Handle logical AND
  if (trimmed.includes("&&")) {
    const parts = splitLogicalOperator(trimmed, "&&");
    let result: unknown = true;
    for (const part of parts) {
      result = safeEvaluateExpression(part, context);
      if (!result) return false;
    }
    return result;
  }

  // Handle arithmetic expressions
  const arithmeticMatch = trimmed.match(/^(.+?)\s*([+\-*/%])\s*(.+)$/);
  if (arithmeticMatch) {
    const [, left, op, right] = arithmeticMatch;
    const leftVal = Number(safeEvaluateExpression(left, context));
    const rightVal = Number(safeEvaluateExpression(right, context));

    switch (op) {
      case "+": return leftVal + rightVal;
      case "-": return leftVal - rightVal;
      case "*": return leftVal * rightVal;
      case "/": return rightVal !== 0 ? leftVal / rightVal : 0;
      case "%": return leftVal % rightVal;
    }
  }

  // Handle property access paths (e.g., "data.user.name", "input.items[0]")
  return getNestedValue(context, trimmed);
}

/**
 * Safely evaluate a condition expression
 */
function safeEvaluateCondition(
  condition: string,
  context: unknown
): boolean {
  const trimmed = condition.trim();

  // Handle negation
  if (trimmed.startsWith("!")) {
    return !safeEvaluateCondition(trimmed.slice(1), context);
  }

  // Handle comparison operators
  const comparisonOperators = ["===", "!==", "==", "!=", "<=", ">=", "<", ">"];
  for (const op of comparisonOperators) {
    const index = trimmed.indexOf(op);
    if (index > 0) {
      const left = safeEvaluateExpression(trimmed.slice(0, index).trim(), context);
      const right = safeEvaluateExpression(trimmed.slice(index + op.length).trim(), context);

      switch (op) {
        case "===": return left === right;
        case "!==": return left !== right;
        case "==": return left == right;
        case "!=": return left != right;
        case "<=": return (left as number) <= (right as number);
        case ">=": return (left as number) >= (right as number);
        case "<": return (left as number) < (right as number);
        case ">": return (left as number) > (right as number);
      }
    }
  }

  // Handle logical operators
  if (trimmed.includes("&&")) {
    const parts = splitLogicalOperator(trimmed, "&&");
    return parts.every((part) => safeEvaluateCondition(part, context));
  }

  if (trimmed.includes("||")) {
    const parts = splitLogicalOperator(trimmed, "||");
    return parts.some((part) => safeEvaluateCondition(part, context));
  }

  // Evaluate as truthy/falsy
  const value = safeEvaluateExpression(trimmed, context);
  return Boolean(value);
}

/**
 * Split expression by logical operator, respecting parentheses
 */
function splitLogicalOperator(expression: string, operator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if (char === "(") depth++;
    if (char === ")") depth--;

    if (depth === 0 && expression.slice(i, i + operator.length) === operator) {
      parts.push(current.trim());
      current = "";
      i += operator.length - 1;
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Get a nested value from an object using a dot-notation path
 * Supports: data.field, data.nested.field, data[0], data.array[0].field
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;

  // Remove leading data. or input. if present
  let normalizedPath = path;
  if (normalizedPath.startsWith("data.")) {
    normalizedPath = normalizedPath.slice(5);
  }

  const parts: string[] = [];
  let current = "";

  for (let i = 0; i < normalizedPath.length; i++) {
    const char = normalizedPath[i];

    if (char === ".") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else if (char === "[") {
      if (current) {
        parts.push(current);
        current = "";
      }
      // Find matching bracket
      const closeBracket = normalizedPath.indexOf("]", i);
      if (closeBracket > i) {
        const indexStr = normalizedPath.slice(i + 1, closeBracket);
        // Remove quotes if present
        const index = indexStr.replace(/['"]/g, "");
        parts.push(index);
        i = closeBracket;
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  let value: unknown = obj;
  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "object") {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Set a nested value in an object using a dot-notation path
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
  return obj;
}

/**
 * Apply a template string with {{variable}} substitution
 */
function applyTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Resolve variable references in a JSON-like string
 */
function resolveVariablesInJson(
  jsonStr: string,
  context: Record<string, unknown>
): string {
  return jsonStr.replace(/\$\{([^}]+)\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    if (value === undefined) return "null";
    if (typeof value === "string") return `"${value}"`;
    return JSON.stringify(value);
  });
}

/**
 * Transform step configuration schema for the UI
 */
export const transformConfigSchema = {
  type: "object",
  properties: {
    operation: {
      type: "string",
      title: "Operation",
      enum: [
        "map",
        "filter",
        "reduce",
        "pick",
        "omit",
        "merge",
        "flatten",
        "get",
        "set",
        "template",
        "custom",
      ],
      description: "The transformation operation to perform",
    },
    expression: {
      type: "string",
      title: "Expression",
      description:
        "JavaScript-like expression for custom transformation (safe evaluation)",
    },
    inputPath: {
      type: "string",
      title: "Input Path",
      description: "Path to the input data (e.g., 'previousStep.data.items')",
    },
  },
  required: [],
};

/**
 * Default configuration for transform step
 */
export const transformDefaultConfig = {
  operation: "custom",
  expression: "data",
  inputPath: "",
};
