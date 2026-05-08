/**
 * MapElementsStep - Modular transform step for mapping elements.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { MapElementsStep as BaseMapElementsStep, type MapElementsStepConfig } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";
import type { AST } from "../../AST.js";
import type { ASTConversionContext } from "../StepRegistry.js";

/**
 * MapElementsStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Maps input elements using a transformation function.
 *
 * Note: MapElementsStep cannot be serialized to JSON because it contains
 * a function mapper. Calling toJSON() will throw an error.
 */
export class MapElementsStep<TInput> extends BaseMapElementsStep<TInput> {
  /** Step name for registry lookup */
  static readonly stepName = "MapElements";

  /** Step category */
  static readonly category = "transform" as const;

  /**
   * Deserialize from JSON format.
   * Always returns null because MapElementsStep cannot be serialized
   * (it contains a function mapper).
   */
  static fromJSON(_json: unknown): MapElementsStep<unknown> | null {
    // MapElementsStep cannot be deserialized because it contains a function
    return null;
  }

  /**
   * Create from AST node (optional - for pattern-based creation).
   */
  static fromAST(_astNode: AST, _context: ASTConversionContext): MapElementsStep<unknown> | null {
    return null;
  }

  /**
   * Clone with optional partial config override.
   */
  override clone(partial?: Partial<MapElementsStepConfig<TInput>>): MapElementsStep<TInput> {
    const { config } = this;
    return new MapElementsStep({
      mapper: partial?.mapper ?? config.mapper,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: MapElementsStep.stepName,
  category: MapElementsStep.category,
  constructor: MapElementsStep,
});
