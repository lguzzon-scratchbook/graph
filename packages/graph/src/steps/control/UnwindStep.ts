/**
 * UnwindStep - Modular control step for UNWIND clause.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { UnwindStep as BaseUnwindStep, type UnwindStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * UnwindStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * UNWIND expands a list into individual rows.
 */
export class UnwindStep extends BaseUnwindStep {
  static readonly stepName = "Unwind";

  static readonly category = "control" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Unwind", { expression: {...}, alias: string }]
   */
  static fromJSON(json: unknown): UnwindStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Unwind") return null;

    const cfg = config as UnwindStepConfig | undefined;
    if (!cfg?.expression || typeof cfg?.alias !== "string") return null;

    return new UnwindStep({
      expression: cfg.expression,
      alias: cfg.alias,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<UnwindStepConfig>): UnwindStep {
    const { config } = this;
    return new UnwindStep({
      expression: partial?.expression ?? config.expression,
      alias: partial?.alias ?? config.alias,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: UnwindStep.stepName,
  category: UnwindStep.category,
  constructor: UnwindStep,
});
