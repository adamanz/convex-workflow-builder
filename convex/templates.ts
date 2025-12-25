/**
 * Step Template Queries
 *
 * Provides queries for fetching step templates from the database.
 * Templates are used to populate the node palette in the workflow builder UI.
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Category validator matching schema
const categoryValidator = v.union(
  v.literal("core"),
  v.literal("data"),
  v.literal("logic"),
  v.literal("integration"),
  v.literal("ai")
);

// Node type validator matching schema
const nodeTypeValidator = v.union(
  v.literal("start"),
  v.literal("end"),
  v.literal("action"),
  v.literal("mutation"),
  v.literal("query"),
  v.literal("condition"),
  v.literal("delay"),
  v.literal("parallel"),
  v.literal("loop"),
  v.literal("ai"),
  v.literal("http"),
  v.literal("transform")
);

/**
 * List all step templates
 *
 * Returns all available templates, optionally filtered by built-in status.
 * Results are sorted by category and then by name.
 *
 * @param includeBuiltIn - Include built-in templates (default: true)
 * @param includeCustom - Include custom templates (default: true)
 * @returns Array of step templates
 */
export const listTemplates = query({
  args: {
    includeBuiltIn: v.optional(v.boolean()),
    includeCustom: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const includeBuiltIn = args.includeBuiltIn ?? true;
    const includeCustom = args.includeCustom ?? true;

    let templates = await ctx.db.query("stepTemplates").collect();

    // Filter by built-in status
    if (!includeBuiltIn) {
      templates = templates.filter((t) => !t.isBuiltIn);
    }
    if (!includeCustom) {
      templates = templates.filter((t) => t.isBuiltIn);
    }

    // Sort by category order, then by name
    const categoryOrder = ["core", "data", "logic", "integration", "ai"];
    templates.sort((a, b) => {
      const categoryDiff =
        categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name);
    });

    return templates;
  },
});

/**
 * Get templates by category
 *
 * Returns all templates belonging to a specific category.
 *
 * @param category - Category to filter by (core, data, logic, integration, ai)
 * @returns Array of step templates in the category
 */
export const getTemplatesByCategory = query({
  args: {
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("stepTemplates")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Sort by name within category
    templates.sort((a, b) => a.name.localeCompare(b.name));

    return templates;
  },
});

/**
 * Get templates by type
 *
 * Returns all templates of a specific node type.
 *
 * @param type - Node type to filter by
 * @returns Array of step templates of the specified type
 */
export const getTemplatesByType = query({
  args: {
    type: nodeTypeValidator,
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("stepTemplates")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();

    return templates;
  },
});

/**
 * Get a single template by ID
 *
 * @param id - Template ID
 * @returns The step template or null if not found
 */
export const getTemplate = query({
  args: {
    id: v.id("stepTemplates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get a template by name
 *
 * Useful for looking up templates by their display name.
 *
 * @param name - Template name
 * @returns The step template or null if not found
 */
export const getTemplateByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stepTemplates")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Get templates grouped by category
 *
 * Returns all templates organized by their category for easy palette rendering.
 *
 * @returns Object with categories as keys and arrays of templates as values
 */
export const getTemplatesGroupedByCategory = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("stepTemplates").collect();

    // Group templates by category
    const grouped: Record<string, typeof templates> = {
      core: [],
      data: [],
      logic: [],
      integration: [],
      ai: [],
    };

    for (const template of templates) {
      if (grouped[template.category]) {
        grouped[template.category].push(template);
      }
    }

    // Sort templates within each category by name
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
  },
});

/**
 * Search templates
 *
 * Search templates by name or description.
 *
 * @param query - Search query string
 * @returns Array of matching templates
 */
export const searchTemplates = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db.query("stepTemplates").collect();
    const searchLower = args.query.toLowerCase();

    // Filter templates by name or description containing the query
    const filtered = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
    );

    // Sort by relevance (name match first, then description match)
    filtered.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(searchLower);
      const bNameMatch = b.name.toLowerCase().includes(searchLower);
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  },
});

/**
 * Create a custom template
 *
 * Allows users to create their own reusable step templates.
 *
 * @param name - Template name
 * @param description - Template description
 * @param type - Node type
 * @param icon - Lucide icon name
 * @param category - Template category
 * @param configSchema - JSON Schema for configuration
 * @param defaultConfig - Default configuration values
 * @returns ID of the created template
 */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    type: nodeTypeValidator,
    icon: v.string(),
    category: categoryValidator,
    configSchema: v.any(),
    defaultConfig: v.any(),
  },
  handler: async (ctx, args) => {
    // Check if template with same name already exists
    const existing = await ctx.db
      .query("stepTemplates")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Template with name "${args.name}" already exists`);
    }

    const templateId = await ctx.db.insert("stepTemplates", {
      ...args,
      isBuiltIn: false, // Custom templates are not built-in
    });

    return templateId;
  },
});

/**
 * Update a custom template
 *
 * Only allows updating custom (non-built-in) templates.
 *
 * @param id - Template ID to update
 * @param updates - Partial template data to update
 * @returns The updated template
 */
export const updateTemplate = mutation({
  args: {
    id: v.id("stepTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    category: v.optional(categoryValidator),
    configSchema: v.optional(v.any()),
    defaultConfig: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const template = await ctx.db.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    if (template.isBuiltIn) {
      throw new Error("Cannot modify built-in templates");
    }

    // Check name uniqueness if name is being updated
    if (updates.name && updates.name !== template.name) {
      const existing = await ctx.db
        .query("stepTemplates")
        .withIndex("by_name", (q) => q.eq("name", updates.name!))
        .first();

      if (existing) {
        throw new Error(`Template with name "${updates.name}" already exists`);
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.configSchema !== undefined)
      updateData.configSchema = updates.configSchema;
    if (updates.defaultConfig !== undefined)
      updateData.defaultConfig = updates.defaultConfig;

    await ctx.db.patch(id, updateData);

    return await ctx.db.get(id);
  },
});

/**
 * Delete a custom template
 *
 * Only allows deleting custom (non-built-in) templates.
 *
 * @param id - Template ID to delete
 */
export const deleteTemplate = mutation({
  args: {
    id: v.id("stepTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template) {
      throw new Error(`Template ${args.id} not found`);
    }

    if (template.isBuiltIn) {
      throw new Error("Cannot delete built-in templates");
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Duplicate a template
 *
 * Creates a copy of an existing template as a custom template.
 *
 * @param id - Source template ID
 * @param name - Name for the new template
 * @returns ID of the new template
 */
export const duplicateTemplate = mutation({
  args: {
    id: v.id("stepTemplates"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.id);
    if (!source) {
      throw new Error(`Template ${args.id} not found`);
    }

    const newName = args.name ?? `${source.name} (Copy)`;

    // Check if name already exists
    const existing = await ctx.db
      .query("stepTemplates")
      .withIndex("by_name", (q) => q.eq("name", newName))
      .first();

    if (existing) {
      throw new Error(`Template with name "${newName}" already exists`);
    }

    const newTemplateId = await ctx.db.insert("stepTemplates", {
      name: newName,
      description: source.description,
      type: source.type,
      icon: source.icon,
      category: source.category,
      configSchema: source.configSchema,
      defaultConfig: source.defaultConfig,
      isBuiltIn: false, // Duplicates are always custom
    });

    return newTemplateId;
  },
});

/**
 * Get template statistics
 *
 * Returns counts of templates by category and type.
 *
 * @returns Statistics about available templates
 */
export const getTemplateStats = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("stepTemplates").collect();

    const byCategory: Record<string, number> = {
      core: 0,
      data: 0,
      logic: 0,
      integration: 0,
      ai: 0,
    };

    const byType: Record<string, number> = {};
    let builtInCount = 0;
    let customCount = 0;

    for (const template of templates) {
      // Count by category
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;

      // Count by type
      byType[template.type] = (byType[template.type] || 0) + 1;

      // Count built-in vs custom
      if (template.isBuiltIn) {
        builtInCount++;
      } else {
        customCount++;
      }
    }

    return {
      total: templates.length,
      builtIn: builtInCount,
      custom: customCount,
      byCategory,
      byType,
    };
  },
});
