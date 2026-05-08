/**
 * DedupStep - Modular filter step for deduplication.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { DedupStep as BaseDedupStep, type DedupStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * DedupStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class DedupStep extends BaseDedupStep {
  /** Step name for registry lookup */
  static readonly stepName = "Dedup";

  /** Step category */
  static readonly category = "filter" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Dedup", {}]
   */
  static fromJSON(json: unknown): DedupStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Dedup") return null;

    const cfg = config as DedupStepConfig | undefined;
    if (!cfg) return null;

    return new DedupStep({
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): DedupStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<DedupStepConfig>): DedupStep {
    const { config } = this;
    return new DedupStep({
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: DedupStep.stepName,
  category: DedupStep.category,
  constructor: DedupStep,
});
