/**
 * RemoveStep - Modular mutation step for removing properties and labels.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { RemoveStep as BaseRemoveStep, type RemoveStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * RemoveStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class RemoveStep extends BaseRemoveStep {
  /** Step name for registry lookup */
  static readonly stepName = "Remove";

  /** Step category */
  static readonly category = "mutation" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Remove", { items: [...] }]
   */
  static fromJSON(json: unknown): RemoveStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Remove") return null;

    const cfg = config as RemoveStepConfig | undefined;
    if (!cfg?.items) return null;

    return new RemoveStep({
      items: cfg.items,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): RemoveStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<RemoveStepConfig>): RemoveStep {
    const { config } = this;
    return new RemoveStep({
      items: partial?.items ?? config.items,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: RemoveStep.stepName,
  category: RemoveStep.category,
  constructor: RemoveStep,
});
