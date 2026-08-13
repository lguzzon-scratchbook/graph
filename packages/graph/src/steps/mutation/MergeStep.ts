/**
 * MergeStep - Modular mutation step for MERGE (upsert) operations.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  MergeStep as BaseMergeStep,
  type MergeStepConfig,
  type MergePatternConfig,
} from "../../Steps.js";
import { stepRegistry, type ASTConversionContext } from "../StepRegistry.js";
import type {
  MergeClause,
  NodePattern,
  MergeRelationshipPattern,
} from "../../AST.js";
import { convertPropertyMap, convertSetValue } from "../shared/astToStepsHelpers.js";

/**
 * MergeStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class MergeStep extends BaseMergeStep {
  static readonly stepName = "Merge";

  static readonly category = "mutation" as const;

  /**
   * Convert a MergeClause AST node into a MergeStep.
   * @param ast The MergeClause AST node.
   */
  static fromAST(ast: MergeClause, _context: ASTConversionContext): MergeStep {
    let pattern: MergePatternConfig;

    if (ast.pattern.type === "NodePattern") {
      const nodePattern = ast.pattern as NodePattern;
      pattern = {
        type: "node",
        variable: nodePattern.variable,
        labels: nodePattern.labels,
        properties: convertPropertyMap(nodePattern.properties),
      };
    } else if (ast.pattern.type === "MergeRelationshipPattern") {
      const relPattern = ast.pattern as MergeRelationshipPattern;
      pattern = {
        type: "edge",
        variable: relPattern.edge.variable,
        label: relPattern.edge.label,
        direction: relPattern.edge.direction,
        properties: convertPropertyMap(relPattern.edge.properties),
        startVariable: relPattern.startVariable,
        endVariable: relPattern.endVariable,
      };
    } else {
      throw new Error(`Unknown MERGE pattern type: ${(ast.pattern as { type: unknown }).type}`);
    }

    return new MergeStep({
      pattern,
      onCreate: ast.onCreate
        ? ast.onCreate.assignments.map((a) => ({
            variable: a.variable,
            property: a.property,
            value: convertSetValue(a.value),
          }))
        : undefined,
      onMatch: ast.onMatch
        ? ast.onMatch.assignments.map((a) => ({
            variable: a.variable,
            property: a.property,
            value: convertSetValue(a.value),
          }))
        : undefined,
    });
  }

  /**
   * Deserialize from JSON format.
   * Format: ["Merge", { pattern: {...}, onCreate?: [...], onMatch?: [...] }]
   */
  static fromJSON(json: unknown): MergeStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Merge") return null;

    const cfg = config as MergeStepConfig | undefined;
    if (!cfg?.pattern) return null;

    return new MergeStep({
      pattern: cfg.pattern,
      onCreate: cfg.onCreate,
      onMatch: cfg.onMatch,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<MergeStepConfig>): MergeStep {
    const { config } = this;
    return new MergeStep({
      pattern: partial?.pattern ?? config.pattern,
      onCreate: partial?.onCreate ?? config.onCreate,
      onMatch: partial?.onMatch ?? config.onMatch,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: MergeStep.stepName,
  category: MergeStep.category,
  constructor: MergeStep,
});
