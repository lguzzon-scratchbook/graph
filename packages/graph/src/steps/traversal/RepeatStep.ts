/**
 * RepeatStep - Modular container step for variable-length path traversal.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import { RepeatStep as BaseRepeatStep, type RepeatStepConfig, type Step } from "../../Steps.js";
import { stepRegistry } from "../StepRegistry.js";

/**
 * RepeatStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class RepeatStep<TSteps extends readonly Step<any>[]> extends BaseRepeatStep<TSteps> {
  static readonly stepName = "Repeat";

  static readonly category = "traversal" as const;

  /**
   * Deserialize from JSON format.
   * Format: ["Repeat", { times?: number, emit?: boolean, ... }, [nestedSteps]]
   */
  static fromJSON(json: unknown): RepeatStep<readonly Step<any>[]> | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config, nestedSteps] = json;
    if (name !== "Repeat") return null;

    const cfg = config as RepeatStepConfig | undefined;
    if (!cfg) return null;

    // Deserialize nested steps if provided
    const steps: Step<any>[] =
      nestedSteps && Array.isArray(nestedSteps)
        ? nestedSteps
            .map((s: unknown) => {
              // Each nested step should be [name, config]
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

    return new RepeatStep(
      {
        times: cfg.times,
        untilSteps: cfg.untilSteps,
        emit: cfg.emit,
        emitStart: cfg.emitStart,
        emitInput: cfg.emitInput,
        stepLabels: cfg.stepLabels,
      },
      steps as unknown as any,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override clone(partial?: Partial<RepeatStepConfig>): RepeatStep<any> {
    const { config, steps } = this;
    return new RepeatStep(
      {
        times: partial?.times ?? config.times,
        untilSteps: partial?.untilSteps ?? config.untilSteps,
        emit: partial?.emit ?? config.emit,
        emitStart: partial?.emitStart ?? config.emitStart,
        emitInput: partial?.emitInput ?? config.emitInput,
        stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
      },
      steps.map((step) => step.clone()),
    );
  }
}

// Register with step registry
stepRegistry.register({
  name: RepeatStep.stepName,
  category: RepeatStep.category,
  constructor: RepeatStep,
});
