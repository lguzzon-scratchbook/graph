/**
 * MultiQueryStep - Modular setop step for multi-statement queries.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  MultiQueryStep as BaseMultiQueryStep,
  type MultiQueryStepConfig,
  type Step,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * MultiQueryStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Executes multiple independent query pipelines sequentially.
 */
export class MultiQueryStep extends BaseMultiQueryStep {
  static readonly stepName = "MultiQuery";

  static readonly category = "setops" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["MultiQuery", {}, [...statements]]
   */
  static fromJSON(json: unknown): MultiQueryStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config, rawStatements] = json;
    if (name !== "MultiQuery") return null;

    const cfg = config as MultiQueryStepConfig | undefined;

    const statements: Step<any>[][] =
      rawStatements && Array.isArray(rawStatements)
        ? rawStatements.map((statement: unknown) => {
            if (!Array.isArray(statement)) return [];
            return statement
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

    return new MultiQueryStep(
      {
        stepLabels: cfg?.stepLabels,
      },
      statements,
    );
  }

  override clone(partial?: Partial<MultiQueryStepConfig>): MultiQueryStep {
    const { config } = this;
    return new MultiQueryStep(
      {
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      this.statements.map((group) => group.map((step) => step.clone())),
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: MultiQueryStep.stepName,
  category: MultiQueryStep.category,
  constructor: MultiQueryStep,
});
