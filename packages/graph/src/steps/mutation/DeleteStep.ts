/**
 * DeleteStep - Modular mutation step for deleting elements.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { DeleteStep as BaseDeleteStep, type DeleteStepConfig } from "../../Steps.js";
import { stepRegistry, type ASTConversionContext } from "../StepRegistry.js";
import type { DeleteClause } from "../../AST.js";

/**
 * DeleteStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class DeleteStep extends BaseDeleteStep {
  static readonly stepName = "Delete";

  static readonly category = "mutation" as const;

  /**
   * Convert a DeleteClause AST node into a DeleteStep.
   * @param ast The DeleteClause AST node.
   */
  static fromAST(ast: DeleteClause, _context: ASTConversionContext): DeleteStep {
    return new DeleteStep({
      variables: ast.variables,
      detach: ast.detach,
    });
  }

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

  override clone(partial?: Partial<DeleteStepConfig>): DeleteStep {
    const { config } = this;
    return new DeleteStep({
      variables: partial?.variables ?? [...config.variables],
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
