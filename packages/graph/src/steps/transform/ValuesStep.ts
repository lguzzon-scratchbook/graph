/**
 * ValuesStep - Modular transform step for value extraction.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { ValuesStep as BaseValuesStep, type ValuesStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * ValuesStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Recursively flattens TraversalPath values to their underlying values.
 */
export class ValuesStep extends BaseValuesStep {
  /** Step name for registry lookup */
  static readonly stepName = "Values";

  /** Step category */
  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Values", {}]
   */
  static fromJSON(json: unknown): ValuesStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Values") return null;

    return new ValuesStep({
      stepLabels: (config as { stepLabels?: string[] } | undefined)?.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): ValuesStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<ValuesStepConfig>): ValuesStep {
    return new ValuesStep({
      stepLabels:
        partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: ValuesStep.stepName,
  category: ValuesStep.category,
  constructor: ValuesStep,
});
