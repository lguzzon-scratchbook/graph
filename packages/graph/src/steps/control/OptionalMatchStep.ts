/**
 * OptionalMatchStep - Modular control step for OPTIONAL MATCH semantics.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  OptionalMatchStep as BaseOptionalMatchStep,
  type OptionalMatchStepConfig,
  type Step,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * OptionalMatchStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * If the nested steps produce results, those are yielded.
 * If no results are found, the input path is yielded with null values bound
 * to the pattern variables.
 */
export class OptionalMatchStep<
  const TSteps extends readonly Step<any>[],
> extends BaseOptionalMatchStep<TSteps> {
  /** Step name for registry lookup */
  static readonly stepName = "OptionalMatch";

  /** Step category */
  static readonly category = "control" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["OptionalMatch", { variables: string[] }, [...nestedSteps]]
   */
  static fromJSON(json: unknown): OptionalMatchStep<readonly Step<any>[]> | null {
    if (!Array.isArray(json) || json.length < 3) return null;
    const [name, config] = json;
    if (name !== "OptionalMatch") return null;

    const cfg = config as OptionalMatchStepConfig | undefined;
    if (!cfg?.variables || !Array.isArray(cfg.variables)) return null;

    // Note: Nested steps would need to be deserialized recursively
    // For now, we just return the step with empty nested steps
    // This is a limitation - full deserialization requires step registry
    return new OptionalMatchStep(
      {
        variables: cfg.variables,
        stepLabels: cfg.stepLabels,
      },
      [],
    );
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(
    _astNode: AST,
    _context: ASTConversionContext,
  ): OptionalMatchStep<readonly Step<any>[]> | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override clone(partial?: Partial<OptionalMatchStepConfig>): OptionalMatchStep<any> {
    const { config, steps } = this;
    return new OptionalMatchStep(
      {
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
        variables: partial?.variables ?? [...config.variables],
      },
      steps.map((step) => step.clone()),
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: OptionalMatchStep.stepName,
  category: OptionalMatchStep.category,
  constructor: OptionalMatchStep,
});
