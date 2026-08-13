/**
 * Shared AST→step conversion normalizers.
 *
 * Self-contained transformers repeatedly used by per-step `fromAST`
 * implementations: property-map flattening (NestedMap/ListLiteral/ParameterRef)
 * and SET-assignment value coercion. Historically these lived only in the
 * astToSteps.ts dispatcher; they are housed here so that each step's conversion
 * logic can live in its own module without duplicating them.
 */
import type { SetValue } from "../../AST.js";
import type { SetAssignmentValue } from "../../Steps.js";

/**
 * Convert a property map, handling nested maps and parameter references.
 * Transforms NestedMap AST nodes into plain objects.
 */
export function convertPropertyMap(props: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!props) return {};

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = convertNestedPropertyValue(value);
  }
  return result;
}

/**
 * Convert a single property value, handling NestedMap, ListLiteral, and ParameterRef.
 */
export function convertNestedPropertyValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  const obj = value as Record<string, unknown>;

  // Handle NestedMap - convert to plain object recursively
  if (obj.type === "NestedMap") {
    return convertPropertyMap(obj.value as Record<string, unknown>);
  }

  // Handle ListLiteral - convert to plain array recursively
  if (obj.type === "ListLiteral") {
    return (obj.values as unknown[]).map(convertNestedPropertyValue);
  }

  // Handle ParameterRef - preserve as-is for runtime resolution
  // The Steps expect the original ParameterRef format
  if (obj.type === "ParameterRef") {
    return obj;
  }

  // For other objects (shouldn't happen in valid AST), return as-is
  return value;
}

/**
 * Convert a SET map value (property map or parameter reference).
 */
export function convertSetMapValue(
  value: Record<string, unknown> | { type: "ParameterRef"; name: string },
): Record<string, unknown> | { type: "parameter"; name: string } {
  // Check if it's a parameter reference
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "ParameterRef"
  ) {
    return { type: "parameter", name: (value as { name: string }).name };
  }
  // It's a property map - convert any nested maps
  return convertPropertyMap(value as Record<string, unknown>);
}

/**
 * Convert a single SET assignment value into a step-level assignment value.
 * Handles literals, property accesses, variable refs, parameter refs,
 * list literals, and nested maps (JSON object values).
 */
export function convertSetValue(value: SetValue): SetAssignmentValue {
  // Handle literal values (primitives)
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return { type: "literal", value };
  }

  // Handle PropertyAccess
  if (value.type === "PropertyAccess") {
    return {
      type: "property",
      variable: value.variable,
      property: value.property,
    };
  }

  // Handle VariableRef
  if (value.type === "VariableRef") {
    return { type: "variable", variable: value.variable };
  }

  // Handle ParameterRef
  if (value.type === "ParameterRef") {
    return { type: "parameter", name: value.name };
  }

  // Handle ListLiteral
  if (value.type === "ListLiteral") {
    return { type: "list", values: value.values as unknown[] };
  }

  // Handle NestedMap (JSON object value)
  if (value.type === "NestedMap") {
    return {
      type: "literal",
      value: convertPropertyMap(value.value as Record<string, unknown>),
    };
  }

  // This should never happen given the SetValue type definition
  // If it does, it's a parser bug or type mismatch
  throw new Error(`Unexpected SetValue type: ${JSON.stringify(value)}`);
}