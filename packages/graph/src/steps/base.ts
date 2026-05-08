/**
 * Base step classes for graph traversal.
 *
 * This module re-exports base classes from Steps.ts during the modularization transition.
 * New code should import from here, but the actual definitions remain in Steps.ts
 * for backward compatibility.
 *
 * @deprecated Re-export module - definitions will move here in a future version
 */

export {
  Step,
  ContainerStep,
  Traverser,
  createTraverser,
  stringifySteps,
  type StepConfig,
  type StepStringToken,
  type StepTokenColorizers,
} from "../Steps.js";
