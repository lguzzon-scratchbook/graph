/**
 * ForeachStep - Modular control step for FOREACH clause.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  ForeachStep as BaseForeachStep,
  type ForeachStepConfig,
  type Step,
  type ForeachListExpression,
} from "../../Steps.js";
import { stepRegistry, type ASTConversionContext } from "../StepRegistry.js";
import type {
  ForeachClause,
  ListExpression,
  SetOperation as ASTSetOperation,
  DeleteOperation as ASTDeleteOperation,
  MatchClause,
  Pattern,
  ShortestPathPattern,
} from "../../AST.js";
import { convertSetValue } from "../shared/astToStepsHelpers.js";
import {
  convertConditionValue,
  convertPattern,
  convertShortestPathPattern,
} from "../shared/patternToSteps.js";
import { DeleteStep } from "../mutation/DeleteStep.js";
import { SetStep } from "../mutation/SetStep.js";

/**
 * ForeachStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 * Iterates over list values and executes inner steps for each element.
 */
export class ForeachStep<
  const TSteps extends readonly Step<any>[],
> extends BaseForeachStep<TSteps> {
  static readonly stepName = "Foreach";

  static readonly category = "control" as const;

  /**
   * Convert a ForeachClause AST node into a ForeachStep.
   */
  static fromAST(
    ast: ForeachClause,
    _context: ASTConversionContext,
  ): ForeachStep<Step<any>[]> {
    const { variable, listExpression, operations } = ast;

    // Convert the list expression
    const stepListExpression = ForeachStep.convertListExpression(listExpression);

    // Convert the operations to inner steps
    const innerSteps: Step<any>[] = [];
    for (const operation of operations) {
      if (operation.type === "SetOperation") {
        const setOp = operation as ASTSetOperation;
        const assignments = setOp.assignments.map((assignment) => ({
          variable: assignment.variable,
          property: assignment.property,
          value: convertSetValue(assignment.value),
        }));
        innerSteps.push(new SetStep({ assignments }));
      } else if (operation.type === "DeleteOperation") {
        // Convert DELETE/DETACH DELETE operations inside FOREACH
        const deleteOp = operation as ASTDeleteOperation;
        innerSteps.push(
          new DeleteStep({
            variables: deleteOp.variables,
            detach: deleteOp.detach,
          }),
        );
      } else if (operation.type === "MatchClause") {
        // Convert MATCH operations inside FOREACH
        const matchClause = operation as MatchClause;
        const matchPattern = matchClause.pattern;
        if (matchPattern.type === "ShortestPathPattern") {
          innerSteps.push(
            ...convertShortestPathPattern(matchPattern as ShortestPathPattern, matchClause.where),
          );
        } else {
          innerSteps.push(...convertPattern(matchPattern as Pattern, matchClause.where));
        }
      }
    }

    return new ForeachStep(
      {
        variable,
        listExpression: stepListExpression,
      },
      innerSteps,
    );
  }

  /**
   * Convert a ListExpression AST node to a ForeachListExpression.
   */
  private static convertListExpression(expr: ListExpression): ForeachListExpression {
    if (expr.type === "ListLiteral") {
      return {
        type: "literal",
        values: expr.values as readonly (string | number | boolean | null)[],
      };
    } else if (expr.type === "PropertyAccess") {
      return {
        type: "property",
        variable: expr.variable,
        property: expr.property,
      };
    } else if (expr.type === "VariableRef") {
      return {
        type: "variable",
        variable: expr.variable,
      };
    } else if (expr.type === "FunctionCall") {
      // Function calls like tail(nodes) used as list expression
      return {
        type: "functionCall",
        name: expr.name,
        args: expr.args.map((arg) => convertConditionValue(arg)),
        distinct: expr.distinct,
      };
    }
    throw new Error(`Unknown list expression type: ${(expr as { type?: string }).type}`);
  }

  /**
   * Deserialize from JSON format.
   * Format: ["Foreach", { variable: string, listExpression? }, [...nestedSteps]]
   */
  static fromJSON(json: unknown): ForeachStep<readonly Step<any>[]> | null {
    if (!Array.isArray(json) || json.length < 3) return null;
    const [name, config, nestedSteps] = json;
    if (name !== "Foreach") return null;

    const cfg = config as ForeachStepConfig | undefined;
    if (!cfg?.variable || typeof cfg.variable !== "string") return null;

    const steps: Step<any>[] =
      nestedSteps && Array.isArray(nestedSteps)
        ? nestedSteps
            .map((s: unknown) => {
              if (Array.isArray(s) && s.length >= 2) {
                const def = stepRegistry.get(s[0] as string);
                if (def) {
                  return stepRegistry.create(s[0] as string, s[1] as Record<string, unknown>);
                }
              }
              return null;
            })
            .filter((s): s is Step<any> => s !== null)
        : [];

    return new ForeachStep(
      {
        variable: cfg.variable,
        listExpression: cfg.listExpression,
        stepLabels: cfg.stepLabels,
      },
      steps,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override clone(partial?: Partial<ForeachStepConfig>): ForeachStep<any> {
    const { config, steps } = this;
    return new ForeachStep(
      {
        variable: partial?.variable ?? config.variable,
        listExpression: partial?.listExpression ?? config.listExpression,
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      steps.map((step) => step.clone()),
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: ForeachStep.stepName,
  category: ForeachStep.category,
  constructor: ForeachStep,
});
