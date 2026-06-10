/**
 * UnfoldStep - Modular transform step for unfolding nested structures.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { UnfoldStep as BaseUnfoldStep, type UnfoldStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * UnfoldStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Unfolds arrays into individual elements.
 */
export class UnfoldStep extends BaseUnfoldStep {
  static readonly stepName = "Unfold";

  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Unfold", {}]
   */
  static fromJSON(json: unknown): UnfoldStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Unfold") return null;

    return new UnfoldStep({
      stepLabels: (config as { stepLabels?: string[] } | undefined)?.stepLabels,
    });
  }

  override clone(partial?: Partial<UnfoldStepConfig>): UnfoldStep {
    return new UnfoldStep({
      stepLabels:
        partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: UnfoldStep.stepName,
  category: UnfoldStep.category,
  constructor: UnfoldStep,
});
