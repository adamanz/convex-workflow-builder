/**
 * Condition Evaluation Step Implementation
 *
 * Evaluates conditional expressions as part of workflow execution.
 * Supports comparison operators, boolean logic, and safe expression evaluation.
 * Returns boolean result for branching decisions.
 */
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Comparison operators supported
 */
type ComparisonOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEquals"
  | "lessThan"
  | "lessThanOrEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "matches"
  | "isEmpty"
  | "isNotEmpty"
  | "isNull"
  | "isNotNull"
  | "isTrue"
  | "isFalse";

/**
 * Logical operators for combining conditions
 */
type LogicalOperator = "and" | "or" | "not";

/**
 * A single condition to evaluate
 */
interface SingleCondition {
  type: "single";
  field: string;
  operator: ComparisonOperator;
  value?: unknown;
}

/**
 * A group of conditions combined with logical operators
 */
interface ConditionGroup {
  type: "group";
  operator: LogicalOperator;
  conditions: (SingleCondition | ConditionGroup)[];
}

/**
 * Evaluate a condition expression
 *
 * @param expression - Condition expression string or structured condition
 * @param inputData - Input data context for evaluation
 * @returns Boolean result
 */
export const evaluateCondition = internalAction({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.string(),
    config: v.object({
      expression: v.string(),
      inputData: v.any(),
      conditions: v.optional(v.any()), // Structured conditions
      combineWith: v.optional(v.string()), // "and" or "or" for multiple conditions
    }),
  },
  handler: async (ctx, args) => {
    const { expression, inputData, conditions, combineWith } = args.config;
    const startTime = Date.now();

    // Log condition evaluation start
    await ctx.runMutation(internal.executions.addExecutionLog, {
      executionId: args.executionId,
      nodeId: args.nodeId,
      level: "debug",
      message: `Evaluating condition`,
      data: { expression, hasStructuredConditions: !!conditions },
    });

    try {
      let result: boolean;

      // If structured conditions are provided, use them
      if (conditions && Array.isArray(conditions) && conditions.length > 0) {
        result = evaluateConditions(
          conditions as (SingleCondition | ConditionGroup)[],
          inputData as Record<string, unknown>,
          (combineWith as LogicalOperator) || "and"
        );
      } else {
        // Otherwise, evaluate the expression string
        result = safeEvaluateCondition(expression, inputData);
      }

      const duration = Date.now() - startTime;

      // Log success
      await ctx.runMutation(internal.executions.addExecutionLog, {
        executionId: args.executionId,
        nodeId: args.nodeId,
        level: "info",
        message: `Condition evaluated: ${result}`,
        data: { result, duration },
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
        message: `Condition evaluation failed: ${errorMessage}`,
        data: { error: errorMessage, duration },
      });

      throw error;
    }
  },
});

/**
 * Evaluate an array of structured conditions
 */
function evaluateConditions(
  conditions: (SingleCondition | ConditionGroup)[],
  context: Record<string, unknown>,
  combineWith: LogicalOperator
): boolean {
  if (conditions.length === 0) {
    return true; // Empty conditions = always true
  }

  const results = conditions.map((condition) => {
    if (condition.type === "group") {
      return evaluateConditionGroup(condition, context);
    } else {
      return evaluateSingleCondition(condition, context);
    }
  });

  if (combineWith === "and") {
    return results.every(Boolean);
  } else if (combineWith === "or") {
    return results.some(Boolean);
  } else if (combineWith === "not") {
    return !results[0];
  }

  return results.every(Boolean);
}

/**
 * Evaluate a condition group
 */
function evaluateConditionGroup(
  group: ConditionGroup,
  context: Record<string, unknown>
): boolean {
  const results = group.conditions.map((condition) => {
    if (condition.type === "group") {
      return evaluateConditionGroup(condition, context);
    } else {
      return evaluateSingleCondition(condition, context);
    }
  });

  switch (group.operator) {
    case "and":
      return results.every(Boolean);
    case "or":
      return results.some(Boolean);
    case "not":
      return !results[0];
    default:
      return results.every(Boolean);
  }
}

/**
 * Evaluate a single condition
 */
function evaluateSingleCondition(
  condition: SingleCondition,
  context: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(context, condition.field);
  const compareValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return fieldValue === compareValue;

    case "notEquals":
      return fieldValue !== compareValue;

    case "greaterThan":
      return Number(fieldValue) > Number(compareValue);

    case "greaterThanOrEquals":
      return Number(fieldValue) >= Number(compareValue);

    case "lessThan":
      return Number(fieldValue) < Number(compareValue);

    case "lessThanOrEquals":
      return Number(fieldValue) <= Number(compareValue);

    case "contains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return false;

    case "notContains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return !fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(compareValue);
      }
      return true;

    case "startsWith":
      return (
        typeof fieldValue === "string" &&
        typeof compareValue === "string" &&
        fieldValue.startsWith(compareValue)
      );

    case "endsWith":
      return (
        typeof fieldValue === "string" &&
        typeof compareValue === "string" &&
        fieldValue.endsWith(compareValue)
      );

    case "matches":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        try {
          const regex = new RegExp(compareValue);
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;

    case "isEmpty":
      if (fieldValue === null || fieldValue === undefined) return true;
      if (typeof fieldValue === "string") return fieldValue.length === 0;
      if (Array.isArray(fieldValue)) return fieldValue.length === 0;
      if (typeof fieldValue === "object") return Object.keys(fieldValue).length === 0;
      return false;

    case "isNotEmpty":
      if (fieldValue === null || fieldValue === undefined) return false;
      if (typeof fieldValue === "string") return fieldValue.length > 0;
      if (Array.isArray(fieldValue)) return fieldValue.length > 0;
      if (typeof fieldValue === "object") return Object.keys(fieldValue).length > 0;
      return true;

    case "isNull":
      return fieldValue === null || fieldValue === undefined;

    case "isNotNull":
      return fieldValue !== null && fieldValue !== undefined;

    case "isTrue":
      return fieldValue === true;

    case "isFalse":
      return fieldValue === false;

    default:
      return false;
  }
}

/**
 * Safely evaluate a condition expression string without using eval
 *
 * Supports:
 * - Comparison operators: ==, ===, !=, !==, <, >, <=, >=
 * - Logical operators: &&, ||, !
 * - Property access: data.field, input.nested.property
 * - Literal values: numbers, strings, booleans, null
 */
function safeEvaluateCondition(
  expression: string,
  context: unknown
): boolean {
  const trimmed = expression.trim();

  // Handle empty expression
  if (!trimmed) return true;

  // Handle parentheses
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    // Check if it's a complete parenthesized expression
    let depth = 0;
    let isComplete = true;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === "(") depth++;
      if (trimmed[i] === ")") depth--;
      if (depth === 0 && i < trimmed.length - 1) {
        isComplete = false;
        break;
      }
    }
    if (isComplete) {
      return safeEvaluateCondition(trimmed.slice(1, -1), context);
    }
  }

  // Handle negation
  if (trimmed.startsWith("!") && !trimmed.startsWith("!=") && !trimmed.startsWith("!==")) {
    const innerExpression = trimmed.slice(1).trim();
    // Handle !(expression)
    if (innerExpression.startsWith("(") && innerExpression.endsWith(")")) {
      return !safeEvaluateCondition(innerExpression.slice(1, -1), context);
    }
    return !safeEvaluateCondition(innerExpression, context);
  }

  // Handle logical OR (lowest precedence)
  const orParts = splitByOperator(trimmed, "||");
  if (orParts.length > 1) {
    return orParts.some((part) => safeEvaluateCondition(part, context));
  }

  // Handle logical AND
  const andParts = splitByOperator(trimmed, "&&");
  if (andParts.length > 1) {
    return andParts.every((part) => safeEvaluateCondition(part, context));
  }

  // Handle comparison operators (in order of specificity)
  const comparisonOperators: Array<{ op: string; fn: (l: unknown, r: unknown) => boolean }> = [
    { op: "===", fn: (l, r) => l === r },
    { op: "!==", fn: (l, r) => l !== r },
    { op: "==", fn: (l, r) => l == r },
    { op: "!=", fn: (l, r) => l != r },
    { op: "<=", fn: (l, r) => Number(l) <= Number(r) },
    { op: ">=", fn: (l, r) => Number(l) >= Number(r) },
    { op: "<", fn: (l, r) => Number(l) < Number(r) },
    { op: ">", fn: (l, r) => Number(l) > Number(r) },
  ];

  for (const { op, fn } of comparisonOperators) {
    const opIndex = findOperatorIndex(trimmed, op);
    if (opIndex > 0) {
      const leftExpr = trimmed.slice(0, opIndex).trim();
      const rightExpr = trimmed.slice(opIndex + op.length).trim();
      const leftValue = evaluateValue(leftExpr, context);
      const rightValue = evaluateValue(rightExpr, context);
      return fn(leftValue, rightValue);
    }
  }

  // If no comparison found, evaluate as boolean
  const value = evaluateValue(trimmed, context);
  return Boolean(value);
}

/**
 * Find the index of an operator, respecting parentheses
 */
function findOperatorIndex(expression: string, operator: string): number {
  let depth = 0;
  for (let i = 0; i < expression.length - operator.length + 1; i++) {
    if (expression[i] === "(") depth++;
    if (expression[i] === ")") depth--;
    if (depth === 0 && expression.slice(i, i + operator.length) === operator) {
      // Make sure we're not inside a longer operator
      if (operator === "=" && (expression[i - 1] === "=" || expression[i - 1] === "!" ||
          expression[i + 1] === "=")) {
        continue;
      }
      if (operator === "<" && expression[i + 1] === "=") continue;
      if (operator === ">" && expression[i + 1] === "=") continue;
      return i;
    }
  }
  return -1;
}

/**
 * Split expression by operator, respecting parentheses
 */
function splitByOperator(expression: string, operator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if (char === "(") depth++;
    if (char === ")") depth--;

    if (depth === 0 && expression.slice(i, i + operator.length) === operator) {
      if (current.trim()) {
        parts.push(current.trim());
      }
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
 * Evaluate a value expression (not a condition)
 */
function evaluateValue(expression: string, context: unknown): unknown {
  const trimmed = expression.trim();

  // Handle literal values
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  // Handle quoted strings
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Handle property access
  return getNestedValue(context, trimmed);
}

/**
 * Get a nested value from an object using a dot-notation path
 * Supports: data.field, data.nested.field, data[0], data.array[0].field
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;

  const parts: string[] = [];
  let current = "";

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

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
      const closeBracket = path.indexOf("]", i);
      if (closeBracket > i) {
        const indexStr = path.slice(i + 1, closeBracket);
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
 * Condition step configuration schema for the UI
 */
export const conditionConfigSchema = {
  type: "object",
  properties: {
    expression: {
      type: "string",
      title: "Expression",
      description:
        "Condition expression (e.g., 'input.status == \"active\" && input.count > 0')",
    },
    conditions: {
      type: "array",
      title: "Conditions",
      description: "Structured conditions for visual condition builder",
      items: {
        type: "object",
        properties: {
          field: {
            type: "string",
            title: "Field",
            description: "The field path to evaluate",
          },
          operator: {
            type: "string",
            title: "Operator",
            enum: [
              "equals",
              "notEquals",
              "greaterThan",
              "greaterThanOrEquals",
              "lessThan",
              "lessThanOrEquals",
              "contains",
              "notContains",
              "startsWith",
              "endsWith",
              "matches",
              "isEmpty",
              "isNotEmpty",
              "isNull",
              "isNotNull",
              "isTrue",
              "isFalse",
            ],
          },
          value: {
            title: "Value",
            description: "The value to compare against",
          },
        },
        required: ["field", "operator"],
      },
    },
    combineWith: {
      type: "string",
      title: "Combine With",
      enum: ["and", "or"],
      default: "and",
      description: "How to combine multiple conditions",
    },
    trueBranch: {
      type: "string",
      title: "True Branch",
      description: "Label for the true branch connection",
    },
    falseBranch: {
      type: "string",
      title: "False Branch",
      description: "Label for the false branch connection",
    },
  },
  required: [],
};

/**
 * Default configuration for condition step
 */
export const conditionDefaultConfig = {
  expression: "",
  conditions: [],
  combineWith: "and",
  trueBranch: "Yes",
  falseBranch: "No",
};
