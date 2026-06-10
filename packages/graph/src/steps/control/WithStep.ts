/**
 * WithStep - Modular control step for WITH clause projection.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { WithStep as BaseWithStep, type WithStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * WithStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Projects variables and optionally applies filtering, ordering, and pagination.
 */
export class WithStep extends BaseWithStep {
  static readonly stepName = "With";

  static readonly category = "control" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["With", { distinct: boolean, items: [...], orderBy?, skip?, limit?, whereCondition? }]
   */
  static fromJSON(json: unknown): WithStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "With") return null;

    const cfg = config as WithStepConfig | undefined;
    if (typeof cfg?.distinct !== "boolean" || !cfg?.items || !Array.isArray(cfg.items)) return null;

    return new WithStep({
      distinct: cfg.distinct,
      items: cfg.items,
      orderBy: cfg.orderBy,
      skip: cfg.skip,
      limit: cfg.limit,
      whereCondition: cfg.whereCondition,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<WithStepConfig>): WithStep {
    const { config } = this;
    return new WithStep({
      distinct: partial?.distinct ?? config.distinct,
      items: partial?.items ?? [...config.items],
      orderBy: partial?.orderBy ?? (config.orderBy ? [...config.orderBy] : undefined),
      skip: partial?.skip ?? config.skip,
      limit: partial?.limit ?? config.limit,
      whereCondition: partial?.whereCondition ?? config.whereCondition,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: WithStep.stepName,
  category: WithStep.category,
  constructor: WithStep,
});
