/**
 * SetStep - Modular mutation step for setting properties.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { SetStep as BaseSetStep, type SetStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * SetStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class SetStep extends BaseSetStep {
  /** Step name for registry lookup */
  static readonly stepName = "Set";

  /** Step category */
  static readonly category = "mutation" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Set", { assignments: [...] }]
   */
  static fromJSON(json: unknown): SetStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Set") return null;

    const cfg = config as SetStepConfig | undefined;
    if (!cfg?.assignments) return null;

    return new SetStep({
      assignments: cfg.assignments,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): SetStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<SetStepConfig>): SetStep {
    const { config } = this;
    return new SetStep({
      assignments: partial?.assignments ?? config.assignments,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: SetStep.stepName,
  category: SetStep.category,
  constructor: SetStep,
});
