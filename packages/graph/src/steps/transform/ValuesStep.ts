/**
 * ValuesStep - Modular transform step for value extraction.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { ValuesStep as BaseValuesStep, type ValuesStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * ValuesStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Recursively flattens TraversalPath values to their underlying values.
 */
export class ValuesStep extends BaseValuesStep {
  static readonly stepName = "Values";

  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Values", {}]
   */
  static fromJSON(json: unknown): ValuesStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Values") return null;

    return new ValuesStep({
      stepLabels: (config as { stepLabels?: string[] } | undefined)?.stepLabels,
    });
  }

  override clone(partial?: Partial<ValuesStepConfig>): ValuesStep {
    return new ValuesStep({
      stepLabels:
        partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: ValuesStep.stepName,
  category: ValuesStep.category,
  constructor: ValuesStep,
});
