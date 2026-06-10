/**
 * AvgStep - Modular aggregate step for averaging numeric values.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { AvgStep as BaseAvgStep, type AggregateStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * AvgStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class AvgStep extends BaseAvgStep {
  static readonly stepName = "Avg";

  static readonly category = "aggregate" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Avg", { property?: string, variable?: string }]
   */
  static fromJSON(json: unknown): AvgStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Avg") return null;

    const cfg = config as AggregateStepConfig | undefined;
    if (!cfg) return null;

    return new AvgStep({
      property: cfg.property,
      variable: cfg.variable,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<AggregateStepConfig>): AvgStep {
    const { config } = this;
    return new AvgStep({
      property: partial?.property ?? config.property,
      variable: partial?.variable ?? config.variable,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: AvgStep.stepName,
  category: AvgStep.category,
  constructor: AvgStep,
});
