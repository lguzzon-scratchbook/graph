/**
 * RangeStep - Modular control step for pagination (SKIP/LIMIT).
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { RangeStep as BaseRangeStep, type RangeStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * RangeStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class RangeStep extends BaseRangeStep {
  static readonly stepName = "Range";

  static readonly category = "control" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Range", { start: number, end: number }]
   */
  static fromJSON(json: unknown): RangeStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Range") return null;

    const cfg = config as RangeStepConfig | undefined;
    if (typeof cfg?.start !== "number" || typeof cfg?.end !== "number") return null;

    return new RangeStep({
      start: cfg.start,
      end: cfg.end,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<RangeStepConfig>): RangeStep {
    const { config } = this;
    return new RangeStep({
      start: partial?.start ?? config.start,
      end: partial?.end ?? config.end,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: RangeStep.stepName,
  category: RangeStep.category,
  constructor: RangeStep,
});
