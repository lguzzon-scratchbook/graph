/**
 * PropertyValuesStep - Modular transform step for property extraction.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  PropertyValuesStep as BasePropertyValuesStep,
  type PropertyValuesStepConfig,
} from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * PropertyValuesStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Extracts specific properties from selected elements.
 */
export class PropertyValuesStep extends BasePropertyValuesStep {
  /** Step name for registry lookup */
  static readonly stepName = "PropertyValues";

  /** Step category */
  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["PropertyValues", { items: [...] }]
   */
  static fromJSON(json: unknown): PropertyValuesStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "PropertyValues") return null;

    const cfg = config as PropertyValuesStepConfig | undefined;
    if (!cfg?.items || !Array.isArray(cfg.items)) return null;

    return new PropertyValuesStep({
      items: cfg.items,
      stepLabels: cfg.stepLabels,
    });
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): PropertyValuesStep | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<PropertyValuesStepConfig>): PropertyValuesStep {
    const { config } = this;
    return new PropertyValuesStep({
      items: partial?.items ?? [...config.items],
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: PropertyValuesStep.stepName,
  category: PropertyValuesStep.category,
  constructor: PropertyValuesStep,
});
