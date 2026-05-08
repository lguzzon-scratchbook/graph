/**
 * BindPathStep - Modular transform step for binding paths to variables.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { BindPathStep as BaseBindPathStep, type BindPathStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * BindPathStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Binds the current TraversalPath to a variable name for named path patterns.
 */
export class BindPathStep extends BaseBindPathStep {
  /** Step name for registry lookup */
  static readonly stepName = "BindPath";

  /** Step category */
  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["BindPath", { pathVariable: string }]
   */
  static fromJSON(json: unknown): BindPathStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "BindPath") return null;

    const cfg = config as BindPathStepConfig | undefined;
    if (!cfg?.pathVariable || typeof cfg.pathVariable !== "string") return null;

    return new BindPathStep({
      pathVariable: cfg.pathVariable,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): BindPathStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<BindPathStepConfig>): BindPathStep {
    const { config } = this;
    return new BindPathStep({
      pathVariable: partial?.pathVariable ?? config.pathVariable,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: BindPathStep.stepName,
  category: BindPathStep.category,
  constructor: BindPathStep,
});
