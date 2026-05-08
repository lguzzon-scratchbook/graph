/**
 * OrderStep - Modular control step for ORDER BY with NULL handling.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { OrderStep as BaseOrderStep, type OrderStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * OrderStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class OrderStep extends BaseOrderStep {
  /** Step name for registry lookup */
  static readonly stepName = "Order";

  /** Step category */
  static readonly category = "control" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Order", { directions: [...] }]
   */
  static fromJSON(json: unknown): OrderStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Order") return null;

    const cfg = config as OrderStepConfig | undefined;
    if (!cfg?.directions || !Array.isArray(cfg.directions)) return null;

    return new OrderStep({
      directions: cfg.directions,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): OrderStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<OrderStepConfig>): OrderStep {
    const { config } = this;
    return new OrderStep({
      directions: partial?.directions ?? [...config.directions],
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: OrderStep.stepName,
  category: OrderStep.category,
  constructor: OrderStep,
});
