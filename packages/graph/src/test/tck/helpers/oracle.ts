/**
 * TCK result oracle.
 * Compares query results against expected outcomes, and extracts
 * labels/types/properties/ids from Graph elements or plain object results.
 */
import { Element } from "../../../Graph.js";

export { Element };

/**
 * Compares two result sets for equality, ignoring order.
 * Each result is expected to be an object (record).
 */
export function resultsMatch(actual: unknown[], expected: unknown[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  const expectedCopy = [...expected];
  for (const actualItem of actual) {
    const idx = expectedCopy.findIndex((e) => deepEqual(e, actualItem));
    if (idx === -1) {
      return false;
    }
    expectedCopy.splice(idx, 1);
  }
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

/**
 * Normalizes a result value from the graph for comparison.
 * Strips internal properties like $id, $label, $type, etc.
 */
export function normalizeResult(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeResult);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      // Skip internal graph properties
      if (key.startsWith("$")) {
        continue;
      }
      result[key] = normalizeResult(val);
    }
    return result;
  }

  return value;
}

/**
 * Extracts properties from a node/edge result for comparison.
 * Returns only the user-defined properties.
 */
export function extractProperties(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (!key.startsWith("$")) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Gets the label of a node result.
 * For Vertex/Edge instances, uses the label property.
 * For plain objects, extracts from id format "Label:uuid".
 */
export function getLabel(value: Record<string, unknown>): string | undefined {
  // If it's an Element instance, use the label property directly
  if (value instanceof Element) {
    return value.label;
  }
  // Try $label first (if set)
  if (value.$label) {
    return value.$label as string;
  }
  // Extract from id format "Label:uuid"
  const id = value.id as string | undefined;
  if (id && typeof id === "string") {
    const colonIndex = id.indexOf(":");
    if (colonIndex > 0) {
      return id.substring(0, colonIndex);
    }
  }
  return undefined;
}

/**
 * Gets the type of an edge result.
 * For Edge instances, uses the label property (edge types are stored as labels).
 * For plain objects, extracts from id format "Type:uuid".
 */
export function getType(value: Record<string, unknown>): string | undefined {
  // If it's an Element instance, use the label property directly
  if (value instanceof Element) {
    return value.label;
  }
  // Try $type first (if set)
  if (value.$type) {
    return value.$type as string;
  }
  // Extract from id format "Type:uuid"
  const id = value.id as string | undefined;
  if (id && typeof id === "string") {
    const colonIndex = id.indexOf(":");
    if (colonIndex > 0) {
      return id.substring(0, colonIndex);
    }
  }
  return undefined;
}

/**
 * Gets a property value from a node/edge result.
 * For Vertex/Edge instances, uses the get() method.
 * For plain objects, looks in the 'properties' sub-object.
 */
export function getProperty(value: Record<string, unknown>, name: string): unknown {
  // If it's a Vertex or Edge instance, use the get() method
  if (value instanceof Element) {
    return value.get(name as never);
  }
  // Fallback for plain objects (e.g., after JSON serialization)
  const props = value.properties as Record<string, unknown> | undefined;
  return props?.[name];
}

/**
 * Gets the internal ID of a node/edge result.
 * For Element instances, uses the id property directly.
 */
export function getId(value: Record<string, unknown>): string | undefined {
  if (value instanceof Element) {
    return value.id;
  }
  return value.id as string | undefined;
}