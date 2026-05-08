/**
 * Mutation steps module - Graph modification operations.
 *
 * @module @codemix/graph/steps/mutation
 *
 * This module provides steps for modifying the graph:
 * - CreateStep: Create vertices and edges
 * - SetStep: Set property values
 * - DeleteStep: Delete elements (with DETACH option)
 * - RemoveStep: Remove properties and labels
 * - MergeStep: MERGE (upsert) pattern
 *
 * All steps self-register with the global stepRegistry on import.
 */

export { CreateStep } from "./CreateStep.js";
export { SetStep } from "./SetStep.js";
export { DeleteStep } from "./DeleteStep.js";
export { RemoveStep } from "./RemoveStep.js";
export { MergeStep } from "./MergeStep.js";

// Re-export config types from source of truth
export type {
  CreateStepConfig,
  SetStepConfig,
  DeleteStepConfig,
  RemoveStepConfig,
  MergeStepConfig,
} from "../../Steps.js";
