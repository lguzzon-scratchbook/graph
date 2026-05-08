/**
 * EdgeStep - Modular traversal step for edge navigation.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { EdgeStep as BaseEdgeStep, type EdgeStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * EdgeStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class EdgeStep extends BaseEdgeStep {
  /** Step name for registry lookup */
  static readonly stepName = "Edge";

  /** Step category */
  static readonly category = "traversal" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Edge", { direction: Direction, edgeLabels: string[] }]
   */
  static fromJSON(json: unknown): EdgeStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Edge") return null;

    const cfg = config as EdgeStepConfig | undefined;
    if (!cfg) return null;

    return new EdgeStep({
      direction: cfg.direction,
      edgeLabels: cfg.edgeLabels,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): EdgeStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<EdgeStepConfig>): EdgeStep {
    const { config } = this;
    return new EdgeStep({
      direction: partial?.direction ?? config.direction,
      edgeLabels: partial?.edgeLabels ?? (config.edgeLabels ? [...config.edgeLabels] : []),
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: EdgeStep.stepName,
  category: EdgeStep.category,
  constructor: EdgeStep,
});
