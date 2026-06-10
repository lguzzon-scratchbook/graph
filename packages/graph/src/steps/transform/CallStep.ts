/**
 * CallStep - Modular transform step for procedure invocation.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { CallStep as BaseCallStep, type CallStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * CallStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Invokes procedures (CALL clause) and yields results.
 */
export class CallStep extends BaseCallStep {
  static readonly stepName = "Call";

  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Call", { procedureName: string, arguments: [...], yieldItems? }]
   */
  static fromJSON(json: unknown): CallStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Call") return null;

    const cfg = config as CallStepConfig | undefined;
    if (!cfg?.procedureName || typeof cfg.procedureName !== "string") return null;
    if (!cfg?.arguments || !Array.isArray(cfg.arguments)) return null;

    return new CallStep({
      procedureName: cfg.procedureName,
      arguments: cfg.arguments,
      yieldItems: cfg.yieldItems,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<CallStepConfig>): CallStep {
    const { config } = this;
    return new CallStep({
      procedureName: partial?.procedureName ?? config.procedureName,
      arguments: partial?.arguments ?? [...config.arguments],
      yieldItems: partial?.yieldItems ?? (config.yieldItems ? [...config.yieldItems] : undefined),
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: CallStep.stepName,
  category: CallStep.category,
  constructor: CallStep,
});
