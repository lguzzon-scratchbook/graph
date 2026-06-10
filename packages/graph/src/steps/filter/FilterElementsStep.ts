/**
 * FilterElementsStep - Modular filter step with index optimization.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  FilterElementsStep as BaseFilterElementsStep,
  type FilterElementsStepConfig,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { TraversalPath } from "../../Traversals.js";

/**
 * FilterElementsStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class FilterElementsStep<
  const TPath extends TraversalPath<any, any, any>,
> extends BaseFilterElementsStep<TPath> {
  static readonly stepName = "FilterElements";

  static readonly category = "filter" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["FilterElements", { condition: Condition }]
   */
  static fromJSON(json: unknown): FilterElementsStep<TraversalPath<any, any, any>> | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "FilterElements") return null;

    const cfg = config as
      | { condition: import("../../Steps.js").Condition; stepLabels?: string[] }
      | undefined;
    if (!cfg?.condition) return null;

    return new FilterElementsStep({
      condition: cfg.condition,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<FilterElementsStepConfig<TPath>>): FilterElementsStep<TPath> {
    const { config } = this;
    return new FilterElementsStep({
      condition: partial?.condition ?? config.condition,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: FilterElementsStep.stepName,
  category: FilterElementsStep.category,
  constructor: FilterElementsStep,
});
