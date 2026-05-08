/**
 * Condition types and evaluation system for graph query filtering.
 *
 * This module re-exports condition types and functions from Steps.ts
 * during the modularization transition.
 *
 * @deprecated Re-export module - definitions will move here in a future version
 */

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
