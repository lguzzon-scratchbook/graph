/**
 * ForeachStep - Modular control step for FOREACH clause.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { ForeachStep as BaseForeachStep, type ForeachStepConfig, type Step } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

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
