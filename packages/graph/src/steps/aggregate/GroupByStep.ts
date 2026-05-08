/**
 * GroupByStep - Modular aggregate step for GROUP BY operations.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { GroupByStep as BaseGroupByStep, type GroupByStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * GroupByStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class GroupByStep extends BaseGroupByStep {
  /** Step name for registry lookup */
  static readonly stepName = "GroupBy";

  /** Step category */
  static readonly category = "aggregate" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["GroupBy", { groupByItems: [...], returnItems: [...] }]
   */
  static fromJSON(json: unknown): GroupByStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "GroupBy") return null;

    const cfg = config as GroupByStepConfig | undefined;
    if (!cfg?.groupByItems || !cfg?.returnItems) return null;

    return new GroupByStep({
      groupByItems: cfg.groupByItems,
      returnItems: cfg.returnItems,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): GroupByStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<GroupByStepConfig>): GroupByStep {
    const { config } = this;
    return new GroupByStep({
      groupByItems: partial?.groupByItems ?? config.groupByItems,
      returnItems: partial?.returnItems ?? config.returnItems,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: GroupByStep.stepName,
  category: GroupByStep.category,
  constructor: GroupByStep,
});
