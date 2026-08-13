/**
 * RemoveStep - Modular mutation step for removing properties and labels.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { RemoveStep as BaseRemoveStep, type RemoveStepConfig, type RemoveStepItem } from "../../Steps.js";
import { stepRegistry, type ASTConversionContext } from "../StepRegistry.js";
import type { RemoveClause } from "../../AST.js";

/**
 * RemoveStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class RemoveStep extends BaseRemoveStep {
  static readonly stepName = "Remove";

  static readonly category = "mutation" as const;

  /**
   * Convert a RemoveClause AST node into a RemoveStep.
   * @param ast The RemoveClause AST node.
   */
  static fromAST(ast: RemoveClause, _context: ASTConversionContext): RemoveStep {
    const items: RemoveStepItem[] = ast.items.map((item) => {
      if (item.type === "RemoveProperty") {
        return {
          type: "property" as const,
          variable: item.variable,
          property: item.property,
        };
      } else {
        // Label removal is not supported - validate early
        throw new Error(
          `REMOVE: Label removal is not supported. Labels are immutable. ` +
            `Cannot remove label '${item.label}' from '${item.variable}'.`,
        );
      }
    });

    return new RemoveStep({ items });
  }

  /**
   * Deserialize from JSON format.
   * Format: ["Remove", { items: [...] }]
   */
  static fromJSON(json: unknown): RemoveStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Remove") return null;

    const cfg = config as RemoveStepConfig | undefined;
    if (!cfg?.items) return null;

    return new RemoveStep({
      items: cfg.items,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<RemoveStepConfig>): RemoveStep {
    const { config } = this;
    return new RemoveStep({
      items: partial?.items ?? config.items,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: RemoveStep.stepName,
  category: RemoveStep.category,
  constructor: RemoveStep,
});
