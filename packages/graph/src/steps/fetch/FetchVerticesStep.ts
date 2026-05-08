/**
 * FetchVerticesStep - Modular fetch step for vertices.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  FetchVerticesStep as BaseFetchVerticesStep,
  type FetchVerticesStepConfig,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * FetchVerticesStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class FetchVerticesStep extends BaseFetchVerticesStep {
  /** Step name for registry lookup */
  static readonly stepName = "FetchVertices";

  /** Step category */
  static readonly category = "fetch" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["FetchVertices", { vertexLabels?: string[], ids?: string[] }]
   */
  static fromJSON(json: unknown): FetchVerticesStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "FetchVertices") return null;

    const cfg = config as FetchVerticesStepConfig | undefined;
    if (!cfg) return null;

    return new FetchVerticesStep({
      vertexLabels: cfg.vertexLabels,
      ids: cfg.ids,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   * Returns null if AST node type not supported.
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): FetchVerticesStep | null {
    // AST conversion handled by astToSteps.ts
    // This method exists for future pattern-matching optimizations
    return null;
  }

  /**
   * Clone with optional partial config override.
   * Returns modular FetchVerticesStep, not base class.
   */
  override clone(partial?: Partial<FetchVerticesStepConfig>): FetchVerticesStep {
    const { config } = this;
    return new FetchVerticesStep({
      vertexLabels:
        partial?.vertexLabels ?? (config.vertexLabels ? [...config.vertexLabels] : undefined),
      ids: partial?.ids ?? (config.ids ? [...config.ids] : undefined),
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: FetchVerticesStep.stepName,
  category: FetchVerticesStep.category,
  constructor: FetchVerticesStep,
});
