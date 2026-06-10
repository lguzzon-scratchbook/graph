/**
 * VertexStep - Modular traversal step for vertex navigation.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { VertexStep as BaseVertexStep, type VertexStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * VertexStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class VertexStep extends BaseVertexStep {
  static readonly stepName = "Vertex";

  static readonly category = "traversal" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Vertex", { direction: Direction, edgeLabels: string[] }]
   */
  static fromJSON(json: unknown): VertexStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Vertex") return null;

    const cfg = config as VertexStepConfig | undefined;
    if (!cfg) return null;

    return new VertexStep({
      direction: cfg.direction,
      edgeLabels: cfg.edgeLabels,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<VertexStepConfig>): VertexStep {
    const { config } = this;
    return new VertexStep({
      direction: partial?.direction ?? config.direction,
      edgeLabels: partial?.edgeLabels ?? (config.edgeLabels ? [...config.edgeLabels] : []),
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: VertexStep.stepName,
  category: VertexStep.category,
  constructor: VertexStep,
});
