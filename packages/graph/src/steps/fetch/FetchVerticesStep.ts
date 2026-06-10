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

/**
 * FetchVerticesStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class FetchVerticesStep extends BaseFetchVerticesStep {
  static readonly stepName = "FetchVertices";

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
