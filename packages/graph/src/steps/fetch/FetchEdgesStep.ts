/**
 * FetchEdgesStep - Modular fetch step for edges.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { FetchEdgesStep as BaseFetchEdgesStep, type FetchEdgesStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * FetchEdgesStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class FetchEdgesStep extends BaseFetchEdgesStep {
  /** Step name for registry lookup */
  static readonly stepName = "FetchEdges";

  /** Step category */
  static readonly category = "fetch" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["FetchEdges", { edgeLabels?: string[], ids?: string[] }]
   */
  static fromJSON(json: unknown): FetchEdgesStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "FetchEdges") return null;

    const cfg = config as FetchEdgesStepConfig | undefined;
    if (!cfg) return null;

    return new FetchEdgesStep({
      edgeLabels: cfg.edgeLabels,
      ids: cfg.ids,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   * Returns null if AST node type not supported.
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): FetchEdgesStep | null {
    // AST conversion handled by astToSteps.ts
    return null;
  }

  /**
   * Clone with optional partial config override.
   * Returns modular FetchEdgesStep, not base class.
   */
  override clone(partial?: Partial<FetchEdgesStepConfig>): FetchEdgesStep {
    const { config } = this;
    return new FetchEdgesStep({
      edgeLabels: partial?.edgeLabels ?? (config.edgeLabels ? [...config.edgeLabels] : undefined),
      ids: partial?.ids ?? (config.ids ? [...config.ids] : undefined),
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: FetchEdgesStep.stepName,
  category: FetchEdgesStep.category,
  constructor: FetchEdgesStep,
});
