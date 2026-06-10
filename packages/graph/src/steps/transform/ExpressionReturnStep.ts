/**
 * ExpressionReturnStep - Modular transform step for expression evaluation in RETURN.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  ExpressionReturnStep as BaseExpressionReturnStep,
  type ExpressionReturnStepConfig,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * ExpressionReturnStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Evaluates arbitrary expressions for RETURN clauses (functions, arithmetic, etc.).
 */
export class ExpressionReturnStep extends BaseExpressionReturnStep {
  static readonly stepName = "ExpressionReturn";

  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["ExpressionReturn", { items: [...] }]
   */
  static fromJSON(json: unknown): ExpressionReturnStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "ExpressionReturn") return null;

    const cfg = config as ExpressionReturnStepConfig | undefined;
    if (!cfg?.items || !Array.isArray(cfg.items)) return null;

    return new ExpressionReturnStep({
      items: cfg.items,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<ExpressionReturnStepConfig>): ExpressionReturnStep {
    const { config } = this;
    return new ExpressionReturnStep({
      items: partial?.items ?? [...config.items],
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: ExpressionReturnStep.stepName,
  category: ExpressionReturnStep.category,
  constructor: ExpressionReturnStep,
});
