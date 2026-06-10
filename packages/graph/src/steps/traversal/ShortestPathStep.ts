/**
 * ShortestPathStep - Modular step for finding shortest paths.
 *
 * Uses BFS for unweighted graphs and Dijkstra's algorithm for weighted graphs.
 * Compatible with Cypher's shortestPath() function.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  ShortestPathStep as BaseShortestPathStep,
  type ShortestPathStepConfig,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * ShortestPathStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class ShortestPathStep extends BaseShortestPathStep {
  static readonly stepName = "ShortestPath";

  static readonly category = "traversal" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["ShortestPath", { targetId?: string, direction?: Direction, ... }]
   */
  static fromJSON(json: unknown): ShortestPathStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "ShortestPath") return null;

    const cfg = config as ShortestPathStepConfig | undefined;
    if (!cfg) return null;

    return new ShortestPathStep({
      targetId: cfg.targetId,
      targetCondition: cfg.targetCondition,
      direction: cfg.direction,
      edgeLabels: cfg.edgeLabels,
      maxDepth: cfg.maxDepth,
      weightProperty: cfg.weightProperty,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<ShortestPathStepConfig>): ShortestPathStep {
    const { config } = this;
    return new ShortestPathStep({
      targetId: partial?.targetId ?? config.targetId,
      targetCondition: partial?.targetCondition ?? config.targetCondition,
      direction: partial?.direction ?? config.direction,
      edgeLabels: partial?.edgeLabels ?? (config.edgeLabels ? [...config.edgeLabels] : undefined),
      maxDepth: partial?.maxDepth ?? config.maxDepth,
      weightProperty: partial?.weightProperty ?? config.weightProperty,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: ShortestPathStep.stepName,
  category: ShortestPathStep.category,
  constructor: ShortestPathStep,
});
