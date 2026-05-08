/**
 * IntersectStep - Modular setop step for Gremlin-style intersect.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  IntersectStep as BaseIntersectStep,
  type IntersectStepConfig,
  type Step,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * IntersectStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Gremlin-style intersect yields only elements present in both input and nested traversal.
 */
export class IntersectStep<
  const TSteps extends readonly Step<any>[],
> extends BaseIntersectStep<TSteps> {
  /** Step name for registry lookup */
  static readonly stepName = "Intersect";

  /** Step category */
  static readonly category = "setops" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Intersect", {}, [...nestedSteps]]
   */
  static fromJSON(json: unknown): IntersectStep<readonly Step<any>[]> | null {
    if (!Array.isArray(json) || json.length < 3) return null;
    const [name, config, nestedSteps] = json;
    if (name !== "Intersect") return null;

    // Note: Nested steps would need to be deserialized recursively
    // For now, we just return the step with empty nested steps
    return new IntersectStep(
      {
        stepLabels: (config as { stepLabels?: string[] } | undefined)?.stepLabels,
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
  ): IntersectStep<readonly Step<any>[]> | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<IntersectStepConfig>): IntersectStep<readonly Step<any>[]> {
    const { config, steps } = this;
    return new IntersectStep(
      {
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      steps.map((step) => step.clone()),
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: IntersectStep.stepName,
  category: IntersectStep.category,
  constructor: IntersectStep,
});
