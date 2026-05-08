/**
 * FilterPredicateStep - Modular filter step using predicate functions.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  FilterPredicateStep as BaseFilterPredicateStep,
  type FilterPredicateStepConfig,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * FilterPredicateStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class FilterPredicateStep<TInput> extends BaseFilterPredicateStep<TInput> {
  /** Step name for registry lookup */
  static readonly stepName = "FilterPredicate";

  /** Step category */
  static readonly category = "filter" as const;

  /**
   * Deserialize from JSON format.
   * Note: Predicate functions cannot be serialized to JSON.
   * This method always returns null.
   */
  static fromJSON(_json: unknown): FilterPredicateStep<unknown> | null {
    // Predicate functions cannot be serialized
    return null;
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(
    _astNode: AST,
    _context: ASTConversionContext,
  ): FilterPredicateStep<unknown> | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(
    partial?: Partial<FilterPredicateStepConfig<TInput>>,
  ): FilterPredicateStep<TInput> {
    const { config } = this;
    return new FilterPredicateStep({
      predicate: partial?.predicate ?? config.predicate,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: FilterPredicateStep.stepName,
  category: FilterPredicateStep.category,
  constructor: FilterPredicateStep,
});
