/**
 * Filter steps module - Element filtering and deduplication.
 *
 * @module @codemix/graph/steps/filter
 *
 * This module provides steps for filtering graph elements:
 * - FilterElementsStep: Filter using conditions with index optimization
 * - FilterPredicateStep: Filter using predicate functions
 * - DedupStep: Remove duplicate elements
 *
 * All steps self-register with the global stepRegistry on import.
 */

export { FilterElementsStep } from "./FilterElementsStep.js";
export { FilterPredicateStep } from "./FilterPredicateStep.js";
export { DedupStep } from "./DedupStep.js";

// Re-export config types from source of truth
export type {
  FilterElementsStepConfig,
  FilterPredicateStepConfig,
  DedupStepConfig,
} from "../../Steps.js";
