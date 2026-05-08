/**
 * MinStep - Modular aggregate step for finding minimum values.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { MinStep as BaseMinStep, type AggregateStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * MinStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class MinStep extends BaseMinStep {
  /** Step name for registry lookup */
  static readonly stepName = "Min";

  /** Step category */
  static readonly category = "aggregate" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Min", { property?: string, variable?: string }]
   */
  static fromJSON(json: unknown): MinStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Min") return null;

    const cfg = config as AggregateStepConfig | undefined;
    if (!cfg) return null;

    return new MinStep({
      property: cfg.property,
      variable: cfg.variable,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): MinStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<AggregateStepConfig>): MinStep {
    const { config } = this;
    return new MinStep({
      property: partial?.property ?? config.property,
      variable: partial?.variable ?? config.variable,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: MinStep.stepName,
  category: MinStep.category,
  constructor: MinStep,
});
