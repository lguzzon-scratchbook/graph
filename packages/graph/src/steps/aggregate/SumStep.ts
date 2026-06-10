/**
 * SumStep - Modular aggregate step for summing numeric values.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { SumStep as BaseSumStep, type AggregateStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * SumStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class SumStep extends BaseSumStep {
  static readonly stepName = "Sum";

  static readonly category = "aggregate" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Sum", { property?: string, variable?: string }]
   */
  static fromJSON(json: unknown): SumStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Sum") return null;

    const cfg = config as AggregateStepConfig | undefined;
    if (!cfg) return null;

    return new SumStep({
      property: cfg.property,
      variable: cfg.variable,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<AggregateStepConfig>): SumStep {
    const { config } = this;
    return new SumStep({
      property: partial?.property ?? config.property,
      variable: partial?.variable ?? config.variable,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: SumStep.stepName,
  category: SumStep.category,
  constructor: SumStep,
});
