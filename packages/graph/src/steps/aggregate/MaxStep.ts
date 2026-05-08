/**
 * MaxStep - Modular aggregate step for finding maximum values.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { MaxStep as BaseMaxStep, type AggregateStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * MaxStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class MaxStep extends BaseMaxStep {
  /** Step name for registry lookup */
  static readonly stepName = "Max";

  /** Step category */
  static readonly category = "aggregate" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Max", { property?: string, variable?: string }]
   */
  static fromJSON(json: unknown): MaxStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Max") return null;

    const cfg = config as AggregateStepConfig | undefined;
    if (!cfg) return null;

    return new MaxStep({
      property: cfg.property,
      variable: cfg.variable,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): MaxStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<AggregateStepConfig>): MaxStep {
    const { config } = this;
    return new MaxStep({
      property: partial?.property ?? config.property,
      variable: partial?.variable ?? config.variable,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: MaxStep.stepName,
  category: MaxStep.category,
  constructor: MaxStep,
});
