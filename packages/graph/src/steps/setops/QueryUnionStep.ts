/**
 * QueryUnionStep - Modular setop step for SQL-style UNION/UNION ALL.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { QueryUnionStep as BaseQueryUnionStep, type QueryUnionStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * QueryUnionStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Combines results from multiple query branches (UNION/UNION ALL semantics).
 */
export class QueryUnionStep extends BaseQueryUnionStep {
  static readonly stepName = "QueryUnion";

  static readonly category = "setops" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["QueryUnion", { all: boolean }, [...branches]]
   */
  static fromJSON(json: unknown): QueryUnionStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "QueryUnion" && name !== "QueryUnionAll") return null;

    const cfg = config as QueryUnionStepConfig | undefined;
    if (typeof cfg?.all !== "boolean") return null;

    // Note: Branches would need to be deserialized recursively
    // For now, we just return the step with empty branches
    return new QueryUnionStep(
      {
        all: cfg.all,
        stepLabels: cfg.stepLabels,
      },
      [],
    );
  }

  override clone(partial?: Partial<QueryUnionStepConfig>): QueryUnionStep {
    const { config } = this;
    return new QueryUnionStep(
      {
        all: partial?.all ?? config.all,
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      [], // Branches would need to be re-cloned from original
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: QueryUnionStep.stepName,
  category: QueryUnionStep.category,
  constructor: QueryUnionStep,
});
