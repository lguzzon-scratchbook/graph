/**
 * CollectStep - Modular aggregate step for collecting values into a list.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { CollectStep as BaseCollectStep, type CollectStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * CollectStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class CollectStep extends BaseCollectStep {
  /** Step name for registry lookup */
  static readonly stepName = "Collect";

  /** Step category */
  static readonly category = "aggregate" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Collect", { variable?: string }]
   */
  static fromJSON(json: unknown): CollectStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Collect") return null;

    const cfg = config as CollectStepConfig | undefined;
    if (!cfg) return null;

    return new CollectStep({
      variable: cfg.variable,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): CollectStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<CollectStepConfig>): CollectStep {
    const { config } = this;
    return new CollectStep({
      variable: partial?.variable ?? config.variable,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: CollectStep.stepName,
  category: CollectStep.category,
  constructor: CollectStep,
});
