/**
 * LabelsStep - Modular transform step for label extraction.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { LabelsStep as BaseLabelsStep, type LabelsStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * LabelsStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Extracts labels from elements (implements labels() and type() functions).
 */
export class LabelsStep extends BaseLabelsStep {
  /** Step name for registry lookup */
  static readonly stepName = "Labels";

  /** Step category */
  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Labels", { returnAsString?: boolean }]
   */
  static fromJSON(json: unknown): LabelsStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Labels") return null;

    const cfg = config as LabelsStepConfig | undefined;

    return new LabelsStep({
      returnAsString: cfg?.returnAsString,
      stepLabels: cfg?.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): LabelsStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<LabelsStepConfig>): LabelsStep {
    const { config } = this;
    return new LabelsStep({
      returnAsString: partial?.returnAsString ?? config.returnAsString,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: LabelsStep.stepName,
  category: LabelsStep.category,
  constructor: LabelsStep,
});
