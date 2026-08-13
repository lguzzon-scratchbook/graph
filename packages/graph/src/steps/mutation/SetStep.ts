/**
 * SetStep - Modular mutation step for setting properties.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { SetStep as BaseSetStep, type SetStepConfig } from "../../Steps.js";
import { stepRegistry, type ASTConversionContext } from "../StepRegistry.js";
import type { SetClause, SetAllProperties, SetAddProperties } from "../../AST.js";
import { convertSetMapValue, convertSetValue } from "../shared/astToStepsHelpers.js";
import type { SetOperation } from "../../Steps.js";

/**
 * SetStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class SetStep extends BaseSetStep {
  static readonly stepName = "Set";

  static readonly category = "mutation" as const;

  /**
   * Convert a SetClause AST node into a SetStep.
   * @param ast The SetClause AST node.
   */
  static fromAST(ast: SetClause, _context: ASTConversionContext): SetStep {
    const assignments: SetOperation[] = ast.assignments.map((assignment) => {
      // Check for SetAllProperties or SetAddProperties (map-based assignments)
      if ("type" in assignment) {
        if (assignment.type === "SetAllProperties") {
          const setAll = assignment as SetAllProperties;
          return {
            type: "setAllProperties" as const,
            variable: setAll.variable,
            properties: convertSetMapValue(setAll.properties),
          };
        } else if (assignment.type === "SetAddProperties") {
          const setAdd = assignment as SetAddProperties;
          return {
            type: "setAddProperties" as const,
            variable: setAdd.variable,
            properties: convertSetMapValue(setAdd.properties),
          };
        }
      }
      // Individual property assignment: n.prop = value
      return {
        variable: assignment.variable,
        property: assignment.property,
        value: convertSetValue(assignment.value),
      };
    });

    return new SetStep({ assignments });
  }

  /**
   * Deserialize from JSON format.
   * Format: ["Set", { assignments: [...] }]
   */
  static fromJSON(json: unknown): SetStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Set") return null;

    const cfg = config as SetStepConfig | undefined;
    if (!cfg?.assignments) return null;

    return new SetStep({
      assignments: cfg.assignments,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<SetStepConfig>): SetStep {
    const { config } = this;
    return new SetStep({
      assignments: partial?.assignments ?? config.assignments,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: SetStep.stepName,
  category: SetStep.category,
  constructor: SetStep,
});
