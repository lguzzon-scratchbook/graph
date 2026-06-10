/**
 * UnionStep - Modular setop step for Gremlin-style union.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { UnionStep as BaseUnionStep, type UnionStepConfig, type Step } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * UnionStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Gremlin-style union combines input with nested traversal results.
 */
export class UnionStep<const TSteps extends readonly Step<any>[]> extends BaseUnionStep<TSteps> {
  static readonly stepName = "Union";

  static readonly category = "setops" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Union", {}, [...nestedSteps]]
   */
  static fromJSON(json: unknown): UnionStep<readonly Step<any>[]> | null {
    if (!Array.isArray(json) || json.length < 3) return null;
    const [name, config] = json;
    if (name !== "Union") return null;

    // Note: Nested steps would need to be deserialized recursively
    // For now, we just return the step with empty nested steps
    return new UnionStep(
      {
        stepLabels: (config as { stepLabels?: string[] } | undefined)?.stepLabels,
      },
      [],
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override clone(partial?: Partial<UnionStepConfig>): UnionStep<any> {
    const { config, steps } = this;
    return new UnionStep(
      {
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      steps.map((step) => step.clone()),
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: UnionStep.stepName,
  category: UnionStep.category,
  constructor: UnionStep,
});
