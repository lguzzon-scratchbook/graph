/**
 * CreateStep - Modular mutation step for creating elements.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { CreateStep as BaseCreateStep, type CreateStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * CreateStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class CreateStep extends BaseCreateStep {
  static readonly stepName = "Create";

  static readonly category = "mutation" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Create", { vertices: [...], edges?: [...] }]
   */
  static fromJSON(json: unknown): CreateStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Create") return null;

    const cfg = config as CreateStepConfig | undefined;
    if (!cfg?.vertices) return null;

    return new CreateStep({
      vertices: cfg.vertices,
      edges: cfg.edges,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<CreateStepConfig>): CreateStep {
    const { config } = this;
    return new CreateStep({
      vertices: partial?.vertices ?? config.vertices,
      edges: partial?.edges ?? config.edges,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: CreateStep.stepName,
  category: CreateStep.category,
  constructor: CreateStep,
});
