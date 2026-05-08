/**
 * UnionStep - Modular setop step for Gremlin-style union.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { UnionStep as BaseUnionStep, type UnionStepConfig, type Step } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * UnionStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Gremlin-style union combines input with nested traversal results.
 */
export class UnionStep<const TSteps extends readonly Step<any>[]> extends BaseUnionStep<TSteps> {
  /** Step name for registry lookup */
  static readonly stepName = "Union";

  /** Step category */
  static readonly category = "setops" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Union", {}, [...nestedSteps]]
   */
  static fromJSON(json: unknown): UnionStep<readonly Step<any>[]> | null {
    if (!Array.isArray(json) || json.length < 3) return null;
    const [name, config, nestedSteps] = json;
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

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(
    _astNode: AST,
    _context: ASTConversionContext,
  ): UnionStep<readonly Step<any>[]> | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<UnionStepConfig>): UnionStep<readonly Step<any>[]> {
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
