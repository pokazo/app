import { jsonSchema, zodSchema } from "ai";
import type { z } from "zod";
import { Outline, safeParseOutline, type OutlineT } from "./outline.js";

/** JSON Schema keys Gemini (Google AI Studio) rejects in structured output / strict tools. */
const GEMINI_STRIP_KEYS = new Set(["maxItems", "$schema"]);

export function isGeminiStructuredModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase();
  return (
    id.includes("google/gemini") ||
    id.startsWith("gemini/") ||
    id.includes("/gemini-") ||
    id.startsWith("gemini-")
  );
}

export function stripJsonSchemaKeywords(
  node: unknown,
  keys: Set<string> = GEMINI_STRIP_KEYS,
): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) stripJsonSchemaKeywords(item, keys);
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (keys.has(key)) delete obj[key];
    else stripJsonSchemaKeywords(obj[key], keys);
  }
}

export function zodJsonSchemaForProvider<T extends z.ZodTypeAny>(
  schema: T,
  modelId: string,
): Record<string, unknown> {
  const raw = zodSchema(schema).jsonSchema as Record<string, unknown>;
  if (!isGeminiStructuredModel(modelId)) return raw;
  const clone = structuredClone(raw);
  stripJsonSchemaKeywords(clone);
  return clone;
}

/** Tool parameters — validation runs in tool execute(), not at the SDK boundary. */
export function toolJsonSchemaForProvider<T extends z.ZodTypeAny>(schema: T, modelId: string) {
  return jsonSchema<unknown>(zodJsonSchemaForProvider(schema, modelId), {
    validate: (value) => ({ success: true, value }),
  });
}

/** generateObject schema: native Zod on OpenAI-like providers; Gemini-safe JSON Schema elsewhere. */
export function generateObjectSchemaForProvider<T extends z.ZodTypeAny>(schema: T, modelId: string) {
  if (!isGeminiStructuredModel(modelId)) return schema;
  const json = zodJsonSchemaForProvider(schema, modelId);
  return jsonSchema<z.infer<T>>(json, {
    validate: (value) => {
      const parsed = schema.safeParse(value);
      if (!parsed.success) return { success: false, error: parsed.error };
      return { success: true, value: parsed.data };
    },
  });
}

export function outlineGenerateObjectSchema(modelId: string) {
  if (!isGeminiStructuredModel(modelId)) return Outline;
  return jsonSchema<OutlineT>(zodJsonSchemaForProvider(Outline, modelId), {
    validate: (value) => {
      const parsed = safeParseOutline(value);
      if (!parsed.success) return { success: false, error: parsed.error };
      return { success: true, value: parsed.data };
    },
  });
}
