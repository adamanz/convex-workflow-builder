/**
 * AI/LLM Step Implementation
 *
 * Executes AI/LLM calls as part of workflow execution.
 * Supports multiple providers (OpenAI, Anthropic, etc.) with
 * prompt templates, temperature control, and model selection.
 */
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

/**
 * Supported AI providers
 */
type AIProvider = "openai" | "anthropic" | "mock";

/**
 * Supported OpenAI models
 */
type OpenAIModel =
  | "gpt-4"
  | "gpt-4-turbo"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-3.5-turbo"
  | "o1"
  | "o1-mini";

/**
 * Supported Anthropic models
 */
type AnthropicModel =
  | "claude-3-5-sonnet-latest"
  | "claude-3-5-haiku-latest"
  | "claude-3-opus-latest"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307";

/**
 * Message format for chat-based models
 */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Execute an AI/LLM call
 *
 * @param prompt - The prompt or messages to send
 * @param model - The model to use
 * @param provider - The AI provider (openai, anthropic)
 * @param temperature - Sampling temperature (0-2)
 * @param maxTokens - Maximum tokens in response
 * @returns AI response
 */
export const executeAICall = internalAction({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.string(),
    config: v.object({
      prompt: v.string(),
      model: v.optional(v.string()),
      provider: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      systemPrompt: v.optional(v.string()),
      messages: v.optional(v.array(v.any())),
      responseFormat: v.optional(v.string()), // "text" or "json"
    }),
  },
  handler: async (ctx, args) => {
    const {
      prompt,
      model = "gpt-4o-mini",
      provider = "openai",
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt,
      messages,
      responseFormat = "text",
    } = args.config;
    const startTime = Date.now();

    // Log AI call start
    await ctx.runMutation(internal.executions.addExecutionLog, {
      executionId: args.executionId,
      nodeId: args.nodeId,
      level: "debug",
      message: "Starting AI call with " + provider + "/" + model,
      data: {
        provider,
        model,
        temperature,
        maxTokens,
        promptLength: prompt.length,
      },
    });

    try {
      let result: AIResponse;

      switch (provider as AIProvider) {
        case "openai":
          result = await callOpenAI({
            prompt,
            model: model as OpenAIModel,
            temperature,
            maxTokens,
            systemPrompt,
            messages: messages as ChatMessage[],
            responseFormat,
          });
          break;

        case "anthropic":
          result = await callAnthropic({
            prompt,
            model: model as AnthropicModel,
            temperature,
            maxTokens,
            systemPrompt,
            messages: messages as ChatMessage[],
          });
          break;

        case "mock":
          // Mock provider for testing
          result = {
            content: "Mock AI response to: " + prompt.substring(0, 50) + "...",
            model,
            provider,
            usage: {
              promptTokens: Math.ceil(prompt.length / 4),
              completionTokens: 20,
              totalTokens: Math.ceil(prompt.length / 4) + 20,
            },
          };
          break;

        default:
          throw new Error("Unsupported AI provider: " + provider);
      }

      const duration = Date.now() - startTime;

      // Log success
      await ctx.runMutation(internal.executions.addExecutionLog, {
        executionId: args.executionId,
        nodeId: args.nodeId,
        level: "info",
        message: "AI call completed successfully",
        data: {
          duration,
          model: result.model,
          tokensUsed: result.usage?.totalTokens,
          responseLength: result.content.length,
        },
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
        message: "AI call failed: " + errorMessage,
        data: { error: errorMessage, duration, provider, model },
      });

      throw error;
    }
  },
});

/**
 * AI response structure
 */
interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  raw?: unknown;
}

/**
 * OpenAI API call configuration
 */
interface OpenAIConfig {
  prompt: string;
  model: OpenAIModel;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  messages?: ChatMessage[];
  responseFormat?: string;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(config: OpenAIConfig): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. " +
      "Please add it to your Convex environment variables."
    );
  }

  // Build messages array
  const messages: Array<{ role: string; content: string }> = [];

  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }

  if (config.messages && config.messages.length > 0) {
    messages.push(
      ...config.messages.map((m) => ({ role: m.role, content: m.content }))
    );
  } else {
    messages.push({ role: "user", content: config.prompt });
  }

  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };

  if (config.responseFormat === "json") {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error("OpenAI API error: " + response.status + " - " + error);
  }

  const data = await response.json() as {
    choices: Array<{
      message: { content: string };
      finish_reason: string;
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  return {
    content: data.choices[0]?.message?.content || "",
    model: config.model,
    provider: "openai",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    finishReason: data.choices[0]?.finish_reason,
    raw: data,
  };
}

/**
 * Anthropic API call configuration
 */
interface AnthropicConfig {
  prompt: string;
  model: AnthropicModel;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  messages?: ChatMessage[];
}

/**
 * Call Anthropic API
 */
async function callAnthropic(config: AnthropicConfig): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is not set. " +
      "Please add it to your Convex environment variables."
    );
  }

  // Build messages array
  const messages: Array<{ role: string; content: string }> = [];

  if (config.messages && config.messages.length > 0) {
    // Filter out system messages (handled separately)
    messages.push(
      ...config.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }))
    );
  } else {
    messages.push({ role: "user", content: config.prompt });
  }

  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  };

  // Add system prompt if provided
  if (config.systemPrompt) {
    requestBody.system = config.systemPrompt;
  } else if (config.messages) {
    const systemMessage = config.messages.find((m) => m.role === "system");
    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error("Anthropic API error: " + response.status + " - " + error);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
    stop_reason: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };

  // Extract text content
  const textContent = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    content: textContent,
    model: config.model,
    provider: "anthropic",
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens:
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    finishReason: data.stop_reason,
    raw: data,
  };
}

/**
 * Apply template variables to a prompt
 */
export function applyPromptTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(variables, path.trim());
    if (value === undefined) return match;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}

/**
 * Get a nested value from an object using a dot-notation path
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * AI step configuration schema for the UI
 */
export const aiConfigSchema = {
  type: "object",
  properties: {
    provider: {
      type: "string",
      title: "Provider",
      enum: ["openai", "anthropic", "mock"],
      default: "openai",
      description: "AI provider to use",
    },
    model: {
      type: "string",
      title: "Model",
      description: "The model to use for generation",
    },
    prompt: {
      type: "string",
      title: "Prompt",
      description: "The prompt to send (supports {{variable}} syntax)",
    },
    systemPrompt: {
      type: "string",
      title: "System Prompt",
      description: "Optional system prompt for context",
    },
    temperature: {
      type: "number",
      title: "Temperature",
      description: "Sampling temperature (0-2, higher = more creative)",
      minimum: 0,
      maximum: 2,
      default: 0.7,
    },
    maxTokens: {
      type: "number",
      title: "Max Tokens",
      description: "Maximum tokens in the response",
      minimum: 1,
      maximum: 128000,
      default: 1000,
    },
    responseFormat: {
      type: "string",
      title: "Response Format",
      enum: ["text", "json"],
      default: "text",
      description: "Expected response format",
    },
  },
  required: ["prompt"],
};

/**
 * Default configuration for AI step
 */
export const aiDefaultConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  prompt: "",
  systemPrompt: "",
  temperature: 0.7,
  maxTokens: 1000,
  responseFormat: "text",
};

/**
 * Available models by provider for UI
 */
export const availableModels: Record<AIProvider, string[]> = {
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "o1",
    "o1-mini",
  ],
  anthropic: [
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
    "claude-3-opus-latest",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  mock: ["mock-model"],
};

/**
 * Common prompt templates for UI
 */
export const promptTemplates = [
  {
    name: "Summarize",
    template: "Please summarize the following content:\n\n{{input.content}}",
    description: "Summarize text content",
  },
  {
    name: "Extract Data",
    template:
      "Extract the following information from the text and return as JSON:\n\nFields to extract: {{input.fields}}\n\nText:\n{{input.text}}",
    description: "Extract structured data from text",
  },
  {
    name: "Classify",
    template:
      "Classify the following text into one of these categories: {{input.categories}}\n\nText: {{input.text}}\n\nRespond with only the category name.",
    description: "Classify text into categories",
  },
  {
    name: "Transform",
    template:
      "Transform the following data according to these instructions:\n\nInstructions: {{input.instructions}}\n\nData:\n{{input.data}}",
    description: "Transform data with AI",
  },
  {
    name: "Generate",
    template: "{{input.prompt}}",
    description: "Free-form generation",
  },
];
