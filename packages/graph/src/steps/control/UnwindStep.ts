/**
 * UnwindStep - Modular control step for UNWIND clause.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { UnwindStep as BaseUnwindStep, type UnwindStepConfig } from "../../Steps.js";
import { stepRegistry, type ASTConversionContext } from "../StepRegistry.js";
import type {
  UnwindClause,
  UnwindExpression as ASTUnwindExpression,
} from "../../AST.js";
import type { UnwindExpression as StepUnwindExpression } from "../../Steps.js";
import { convertConditionValue } from "../shared/patternToSteps.js";

/**
 * UnwindStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * UNWIND expands a list into individual rows.
 */
export class UnwindStep extends BaseUnwindStep {
  static readonly stepName = "Unwind";

  static readonly category = "control" as const;

  /**
   * Convert an UnwindClause AST node into an UnwindStep.
   */
  static fromAST(ast: UnwindClause, _context: ASTConversionContext): UnwindStep {
    const expression = UnwindStep.convertUnwindExpression(ast.expression);
    return new UnwindStep({
      expression,
      alias: ast.alias,
    });
  }

  /**
   * Convert an UNWIND expression AST node to a StepUnwindExpression.
   */
  private static convertUnwindExpression(expr: ASTUnwindExpression): StepUnwindExpression {
    if (expr.type === "ListLiteral") {
      // ListLiteral from UNWIND grammar - values may be complex AST nodes
      const isPrimitive = (v: unknown): boolean => {
        return (
          typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null
        );
      };

      const allPrimitives = expr.values.every(isPrimitive);

      if (allPrimitives) {
        // Simple case: all values are primitives
        return {
          type: "literal",
          values: expr.values,
        };
      }

      // Complex case: values contain AST nodes that need runtime evaluation
      return {
        type: "expression",
        value: convertConditionValue(expr),
      };
    }

    if (expr.type === "NullLiteral") {
      return { type: "null" };
    }

    if (expr.type === "PropertyAccess") {
      return {
        type: "property",
        variable: expr.variable,
        property: expr.property,
      };
    }

    if (expr.type === "VariableRef") {
      return {
        type: "variable",
        variable: expr.variable,
      };
    }

    if (expr.type === "ParameterRef") {
      return {
        type: "parameter",
        name: expr.name,
      };
    }

    if (expr.type === "FunctionCall") {
      // Convert function call arguments to ConditionValue
      const args = expr.args.map((arg) => convertConditionValue(arg));
      return {
        type: "function",
        name: expr.name,
        args,
        distinct: expr.distinct ?? false,
      };
    }

    if (expr.type === "ArithmeticExpression") {
      // Convert arithmetic expression to ConditionValue for evaluation
      return {
        type: "expression",
        value: convertConditionValue(expr),
      };
    }

    throw new Error(`Unknown UNWIND expression type: ${(expr as unknown as { type?: string }).type}`);
  }

  /**
   * Deserialize from JSON format.
   * Format: ["Unwind", { expression: {...}, alias: string }]
   */
  static fromJSON(json: unknown): UnwindStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Unwind") return null;

    const cfg = config as UnwindStepConfig | undefined;
    if (!cfg?.expression || typeof cfg?.alias !== "string") return null;

    return new UnwindStep({
      expression: cfg.expression,
      alias: cfg.alias,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<UnwindStepConfig>): UnwindStep {
    const { config } = this;
    return new UnwindStep({
      expression: partial?.expression ?? config.expression,
      alias: partial?.alias ?? config.alias,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: UnwindStep.stepName,
  category: UnwindStep.category,
  constructor: UnwindStep,
});
