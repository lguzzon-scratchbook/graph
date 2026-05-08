/**
 * Aggregate steps module - Aggregation and GROUP BY operations.
 *
 * @module @codemix/graph/steps/aggregate
 *
 * This module provides steps for aggregating values:
 * - CountStep: Count elements
 * - SumStep: Sum numeric values
 * - AvgStep: Average numeric values
 * - MinStep: Minimum value
 * - MaxStep: Maximum value
 * - CollectStep: Collect into list
 * - GroupByStep: GROUP BY with multiple aggregates
 *
 * All steps self-register with the global stepRegistry on import.
 */

export { CountStep } from "./CountStep.js";
export { SumStep } from "./SumStep.js";
export { AvgStep } from "./AvgStep.js";
export { MinStep } from "./MinStep.js";
export { MaxStep } from "./MaxStep.js";
export { CollectStep } from "./CollectStep.js";
export { GroupByStep } from "./GroupByStep.js";

// Re-export config types from source of truth
export type {
  CountStepConfig,
  AggregateStepConfig,
  CollectStepConfig,
  GroupByStepConfig,
} from "../../Steps.js";
