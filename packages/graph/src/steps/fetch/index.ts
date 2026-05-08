/**
 * Fetch steps module - Vertex and edge retrieval operations.
 *
 * @module @codemix/graph/steps/fetch
 *
 * This module provides steps for fetching graph elements:
 * - FetchVerticesStep: Retrieve vertices by label or ID
 * - FetchEdgesStep: Retrieve edges by label or ID
 * - CartesianFetchStep: Cartesian product with optional filtering
 *
 * All steps self-register with the global stepRegistry on import.
 */

export { FetchVerticesStep } from "./FetchVerticesStep.js";
export { FetchEdgesStep } from "./FetchEdgesStep.js";
export { CartesianFetchStep } from "./CartesianFetchStep.js";

// Re-export config types from source of truth
export type {
  FetchVerticesStepConfig,
  FetchEdgesStepConfig,
  CartesianFetchStepConfig,
} from "../../Steps.js";
