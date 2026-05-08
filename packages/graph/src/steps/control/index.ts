/**
 * Control steps module - Query control flow and projection.
 *
 * @module @codemix/graph/steps/control
 *
 * This module provides steps for controlling query execution flow:
 * - RangeStep: Pagination (SKIP/LIMIT)
 * - OrderStep: ORDER BY with NULL handling
 * - OptionalMatchStep: OPTIONAL MATCH with null binding
 * - WithStep: WITH clause projection and filtering
 * - UnwindStep: UNWIND list expansion
 * - ForeachStep: FOREACH iteration for side effects
 *
 * All steps self-register with the global stepRegistry on import.
 */

export { RangeStep } from "./RangeStep.js";
export { OrderStep } from "./OrderStep.js";
export { OptionalMatchStep } from "./OptionalMatchStep.js";
export { WithStep } from "./WithStep.js";
export { UnwindStep } from "./UnwindStep.js";
export { ForeachStep } from "./ForeachStep.js";

// Re-export config types from source of truth
export type {
  RangeStepConfig,
  OrderStepConfig,
  OrderDirection,
  NullsOrdering,
  OptionalMatchStepConfig,
  WithStepConfig,
  WithItemConfig,
  UnwindStepConfig,
  UnwindExpression,
  ForeachStepConfig,
  ForeachListExpression,
} from "../../Steps.js";
