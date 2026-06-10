/**
 * CartesianFetchStep - Modular fetch step for cartesian product operations.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  CartesianFetchStep as BaseCartesianFetchStep,
  type CartesianFetchStepConfig,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * CartesianFetchStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class CartesianFetchStep extends BaseCartesianFetchStep {
  static readonly stepName = "CartesianFetch";

  static readonly category = "fetch" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["CartesianFetch", { vertexLabels?: string[], condition?: Condition }]
   */
  static fromJSON(json: unknown): CartesianFetchStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "CartesianFetch") return null;

    const cfg = config as CartesianFetchStepConfig | undefined;
    if (!cfg) return null;

    return new CartesianFetchStep({
      vertexLabels: cfg.vertexLabels,
      condition: cfg.condition,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<CartesianFetchStepConfig>): CartesianFetchStep {
    const { config } = this;
    return new CartesianFetchStep({
      vertexLabels:
        partial?.vertexLabels ?? (config.vertexLabels ? [...config.vertexLabels] : undefined),
      condition: partial?.condition ?? config.condition,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: CartesianFetchStep.stepName,
  category: CartesianFetchStep.category,
  constructor: CartesianFetchStep,
});
