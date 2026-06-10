/**
 * QueryUnionStep - Modular setop step for SQL-style UNION/UNION ALL.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  QueryUnionStep as BaseQueryUnionStep,
  type QueryUnionStepConfig,
  type Step,
} from "../../Steps.js";
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
    const [name, config, rawBranches] = json;
    if (name !== "QueryUnion" && name !== "QueryUnionAll") return null;

    const cfg = config as QueryUnionStepConfig | undefined;
    if (typeof cfg?.all !== "boolean") return null;

    const branches: Step<any>[][] =
      rawBranches && Array.isArray(rawBranches)
        ? rawBranches.map((branch: unknown) => {
            if (!Array.isArray(branch)) return [];
            return branch
              .map((s: unknown) => {
                if (Array.isArray(s) && s.length >= 2) {
                  const def = stepRegistry.get(s[0] as string);
                  if (def) {
                    return stepRegistry.create(s[0] as string, s[1] as Record<string, unknown>);
                  }
                }
                return null;
              })
              .filter((s): s is Step<any> => s !== null);
          })
        : [];

    return new QueryUnionStep(
      {
        all: cfg.all,
        stepLabels: cfg.stepLabels,
      },
      branches,
    );
  }

  override clone(partial?: Partial<QueryUnionStepConfig>): QueryUnionStep {
    const { config } = this;
    return new QueryUnionStep(
      {
        all: partial?.all ?? config.all,
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      this.branches.map((group) => group.map((step) => step.clone())),
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: QueryUnionStep.stepName,
  category: QueryUnionStep.category,
  constructor: QueryUnionStep,
});
