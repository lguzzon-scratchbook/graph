/**
 * MultiQueryStep - Modular setop step for multi-statement queries.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { MultiQueryStep as BaseMultiQueryStep, type MultiQueryStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * MultiQueryStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Executes multiple independent query pipelines sequentially.
 */
export class MultiQueryStep extends BaseMultiQueryStep {
  /** Step name for registry lookup */
  static readonly stepName = "MultiQuery";

  /** Step category */
  static readonly category = "setops" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["MultiQuery", {}, [...statements]]
   */
  static fromJSON(json: unknown): MultiQueryStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "MultiQuery") return null;

    const cfg = config as MultiQueryStepConfig | undefined;

    // Note: Statements would need to be deserialized recursively
    // For now, we just return the step with empty statements
    return new MultiQueryStep(
      {
        stepLabels: cfg?.stepLabels,
      },
      [],
    );
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): MultiQueryStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<MultiQueryStepConfig>): MultiQueryStep {
    const { config } = this;
    return new MultiQueryStep(
      {
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      [], // Statements would need to be re-cloned from original
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: MultiQueryStep.stepName,
  category: MultiQueryStep.category,
  constructor: MultiQueryStep,
});
