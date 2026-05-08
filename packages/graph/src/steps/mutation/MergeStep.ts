/**
 * MergeStep - Modular mutation step for MERGE (upsert) operations.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { MergeStep as BaseMergeStep, type MergeStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * MergeStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class MergeStep extends BaseMergeStep {
  /** Step name for registry lookup */
  static readonly stepName = "Merge";

  /** Step category */
  static readonly category = "mutation" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Merge", { pattern: {...}, onCreate?: [...], onMatch?: [...] }]
   */
  static fromJSON(json: unknown): MergeStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Merge") return null;

    const cfg = config as MergeStepConfig | undefined;
    if (!cfg?.pattern) return null;

    return new MergeStep({
      pattern: cfg.pattern,
      onCreate: cfg.onCreate,
      onMatch: cfg.onMatch,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): MergeStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<MergeStepConfig>): MergeStep {
    const { config } = this;
    return new MergeStep({
      pattern: partial?.pattern ?? config.pattern,
      onCreate: partial?.onCreate ?? config.onCreate,
      onMatch: partial?.onMatch ?? config.onMatch,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: MergeStep.stepName,
  category: MergeStep.category,
  constructor: MergeStep,
});
