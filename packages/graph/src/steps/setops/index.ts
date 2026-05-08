/**
 * Set operation steps module - Union, Intersect, and multi-query operations.
 *
 * @module @codemix/graph/steps/setops
 *
 * This module provides steps for set operations:
 * - UnionStep: Gremlin-style union (combines input with nested results)
 * - IntersectStep: Gremlin-style intersect (yields common elements)
 * - QueryUnionStep: SQL-style UNION/UNION ALL (combines query branches)
 * - MultiQueryStep: Multi-statement query execution
 *
 * All steps self-register with the global stepRegistry on import.
 */

export { UnionStep } from "./UnionStep.js";
export { IntersectStep } from "./IntersectStep.js";
export { QueryUnionStep } from "./QueryUnionStep.js";
export { MultiQueryStep } from "./MultiQueryStep.js";

// Re-export config types from source of truth
export type {
  UnionStepConfig,
  IntersectStepConfig,
  QueryUnionStepConfig,
  MultiQueryStepConfig,
} from "../../Steps.js";
