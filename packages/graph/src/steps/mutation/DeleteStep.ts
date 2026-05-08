/**
 * DeleteStep - Modular mutation step for deleting elements.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { DeleteStep as BaseDeleteStep, type DeleteStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * DeleteStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class DeleteStep extends BaseDeleteStep {
  /** Step name for registry lookup */
  static readonly stepName = "Delete";

  /** Step category */
  static readonly category = "mutation" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Delete", { variables: string[], detach?: boolean }]
   */
  static fromJSON(json: unknown): DeleteStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Delete") return null;

    const cfg = config as DeleteStepConfig | undefined;
    if (!cfg?.variables) return null;

    return new DeleteStep({
      variables: cfg.variables,
      detach: cfg.detach,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): DeleteStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<DeleteStepConfig>): DeleteStep {
    const { config } = this;
    return new DeleteStep({
      variables: partial?.variables ?? config.variables,
      detach: partial?.detach ?? config.detach,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: DeleteStep.stepName,
  category: DeleteStep.category,
  constructor: DeleteStep,
});
