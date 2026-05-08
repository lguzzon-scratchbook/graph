/**
 * CountStep - Modular aggregate step for counting elements.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { CountStep as BaseCountStep, type CountStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * CountStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class CountStep extends BaseCountStep {
  /** Step name for registry lookup */
  static readonly stepName = "Count";

  /** Step category */
  static readonly category = "aggregate" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Count", {}]
   */
  static fromJSON(json: unknown): CountStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Count") return null;

    const cfg = config as CountStepConfig | undefined;
    if (!cfg) return null;

    return new CountStep({
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): CountStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<CountStepConfig>): CountStep {
    const { config } = this;
    return new CountStep({
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: CountStep.stepName,
  category: CountStep.category,
  constructor: CountStep,
});
