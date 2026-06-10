/**
 * SelectStep - Modular transform step for path selection.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { SelectStep as BaseSelectStep, type SelectStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * SelectStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Selects paths by their labels (implements select() step).
 */
export class SelectStep extends BaseSelectStep {
  static readonly stepName = "Select";

  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Select", { pathLabels: string[] }]
   */
  static fromJSON(json: unknown): SelectStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Select") return null;

    const cfg = config as SelectStepConfig | undefined;
    if (!cfg?.pathLabels || !Array.isArray(cfg.pathLabels)) return null;

    return new SelectStep({
      pathLabels: cfg.pathLabels,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<SelectStepConfig>): SelectStep {
    const { config } = this;
    return new SelectStep({
      pathLabels: partial?.pathLabels ?? [...config.pathLabels],
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: SelectStep.stepName,
  category: SelectStep.category,
  constructor: SelectStep,
});
