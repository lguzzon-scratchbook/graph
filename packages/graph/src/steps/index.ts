/**
 * Steps module - Modularized step system for graph traversals.
 *
 * This module provides all traversal steps organized by category:
 * - Base: Step, ContainerStep, Traverser
 * - Registry: StepRegistry for dynamic step registration
 * - Conditions: Condition types and evaluation
 *
 * Wave 1 (Foundation) exports:
 * - StepRegistry, stepRegistry, StepConstructor, StepDefinition
 * - Step, ContainerStep, Traverser, createTraverser
 * - Condition types and evaluateCondition
 *
 * Usage:
 * ```typescript
 * import { stepRegistry, Step, evaluateCondition } from "@codemix/graph/steps";
 * ```
 *
 * @remarks
 * During the modularization transition, Step, ContainerStep, Traverser, and
 * condition types are re-exported from Steps.ts for backward compatibility.
 * Eventually these will be moved to this module.
 */

// ============================================================================
// Base Classes (re-exported from Steps.ts during transition)
// ============================================================================

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

// ============================================================================
// Registry (new - defined in this module)
// ============================================================================

export {
  StepRegistry,
  stepRegistry,
  isKnownStep,
  createStepFromJSON,
  type StepConstructor,
  type StepDefinition,
  type StepCategory,
  type ASTConversionContext,
} from "./StepRegistry.js";

// ============================================================================
// Conditions (re-exported from Steps.ts during transition)
// ============================================================================

export {
  evaluateCondition,
  resolveConditionValue,
  stringifyCondition,
  stringifyConditionValueRef,
  compare,
  type Condition,
  type ConditionValue,
  type ConditionValueRef,
  type BinaryCondition,
  type UnaryCondition,
  type LogicalCondition,
  type NotCondition,
  type InCondition,
  type ExpressionCondition,
  type LabelWildcardCondition,
  type IsLabeledCondition,
  type UnaryOperator,
  type BinaryOperator,
  type LogicalOperator,
  type ArithmeticOperator,
  type SimpleCaseAlternativeValue,
  type SearchedCaseAlternativeValue,
  type MapProjectionSelectorValue,
} from "../Steps.js";

// ============================================================================
// Fetch Steps (Wave 2 - category modules)
// ============================================================================

export {
  FetchVerticesStep,
  FetchEdgesStep,
  CartesianFetchStep,
  type FetchVerticesStepConfig,
  type FetchEdgesStepConfig,
  type CartesianFetchStepConfig,
} from "./fetch/index.js";
