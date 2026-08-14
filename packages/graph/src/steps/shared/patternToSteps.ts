/**
 * Shared pattern/condition-to-steps conversion engine.
 *
 * The core that turns a Cypher MATCH/WHERE pattern (and the EXISTS subqueries
 * / label expressions it references) into executable steps: a single
 * `toSteps(pattern, whereClause)` entry point with supporting machinery
 * (shortest-path, quantified/variable-length edges, conditions, label
 * expressions, and the AST-expression-to-condition-value coercer).
 *
 * Historically this lived inside the astToSteps.ts dispatcher where it was
 * privately called by ~40 functions. It is extracted here so that
 * fetch/traversal/filter step `fromAST` implementations can reuse it, and so
 * the dispatcher keeps only clause-ordering/aliasing concerns.
 */
import {
  BindPathStep,
  CartesianFetchStep,
  EdgeStep,
  FetchVerticesStep,
  FilterElementsStep,
  RepeatStep,
  ShortestPathStep,
  VertexStep,
  type Step,
} from "../../Steps.js";
import { functionArgExpectsPath } from "../../FunctionRegistry.js";
import type {
  Pattern,
  MultiPattern,
  NodePattern,
  EdgePattern,
  ShortestPathPattern,
  ParenthesizedPathPattern,
  WhereClause,
  Condition,
  LabelExpression,
  NotCondition,
  PropertyCondition,
  ExistsCondition,
  AndCondition,
  OrCondition,
  XorCondition,
  InCondition,
  IsNullCondition,
  RegexCondition,
  StringPredicateCondition,
  Quantifier,
  ExpressionCondition as ASTExpressionCondition,
} from "../../AST.js";
import type {
  Condition as StepCondition,
  ConditionValue as StepConditionValue,
  BinaryOperator,
} from "../../Steps.js";

export function convertShortestPathPattern(
  pattern: ShortestPathPattern,
  whereClause?: WhereClause,
): Step<any>[] {
  // Check if allShortestPaths is requested - not yet implemented
  if (pattern.all === true) {
    throw new Error(
      "allShortestPaths() is not yet implemented. Use shortestPath() to find a single shortest path.",
    );
  }

  const steps: Step<any>[] = [];
  const { source, target, edge, variable } = pattern;

  // Build the source vertex fetch step
  const sourceStepLabels = source.variable ? [source.variable] : undefined;
  steps.push(
    new FetchVerticesStep({
      vertexLabels: source.labels.length > 0 ? source.labels : undefined,
      stepLabels: sourceStepLabels,
    }),
  );

  // Apply WHERE conditions that reference the source variable
  let targetCondition: StepCondition | undefined;

  if (whereClause && source.variable) {
    const { early, late } = splitASTConditionByVariables(whereClause.condition, [source.variable]);

    // Apply early conditions to filter source vertices
    if (early) {
      steps.push(new FilterElementsStep({ condition: convertCondition(early) }));
    }

    // Extract target conditions from late conditions
    if (late && target.variable) {
      const targetVarConditions = extractConditionsForVariable(late, target.variable);
      if (targetVarConditions) {
        // Use direct property access for shortestPath target conditions
        // since the target vertex hasn't been bound to a variable yet
        targetCondition = convertCondition(targetVarConditions, true);
      }
    }
  }

  // Build target condition from target node labels and properties
  const targetConditions: StepCondition[] = [];

  // Add label conditions for target
  if (target.labels.length > 0) {
    if (target.labels.length === 1) {
      targetConditions.push(["=", "@label", target.labels[0]!] as StepCondition);
    } else {
      targetConditions.push([
        "or",
        ...target.labels.map((label) => ["=", "@label", label] as StepCondition),
      ] as StepCondition);
    }
  }

  // Add property conditions from WHERE clause for target variable
  if (targetCondition) {
    targetConditions.push(targetCondition);
  }

  // Combine target conditions
  let finalTargetCondition: StepCondition | undefined;
  if (targetConditions.length === 1) {
    finalTargetCondition = targetConditions[0];
  } else if (targetConditions.length > 1) {
    finalTargetCondition = ["and", ...targetConditions] as StepCondition;
  }

  // Determine edge direction and labels
  const direction = edge.direction;
  const edgeLabels = edge.labels;

  // Create the ShortestPathStep
  const shortestPathConfig: {
    targetCondition?: StepCondition;
    direction: "in" | "out" | "both";
    edgeLabels: readonly string[];
    maxDepth?: number;
    stepLabels?: readonly string[];
  } = {
    targetCondition: finalTargetCondition,
    direction,
    edgeLabels,
  };

  // Handle quantifier for max depth
  if (edge.quantifier) {
    shortestPathConfig.maxDepth = edge.quantifier.max ?? 100;
  }

  // Add step labels for the target vertex
  // Include both the path variable (if any) and the target variable (if any)
  const pathStepLabels: string[] = [];
  if (variable) {
    pathStepLabels.push(variable);
  }
  if (target.variable) {
    pathStepLabels.push(target.variable);
  }
  if (pathStepLabels.length > 0) {
    shortestPathConfig.stepLabels = pathStepLabels;
  }

  steps.push(new ShortestPathStep(shortestPathConfig));

  return steps;
}

/**
 * Extract conditions that specifically reference a given variable.
 */
export function extractConditionsForVariable(
  condition: Condition,
  variable: string,
): Condition | undefined {
  if (
    condition.type === "AndCondition" ||
    condition.type === "OrCondition" ||
    condition.type === "XorCondition"
  ) {
    const leftExtracted = extractConditionsForVariable(
      (condition as AndCondition | OrCondition | XorCondition).left,
      variable,
    );
    const rightExtracted = extractConditionsForVariable(
      (condition as AndCondition | OrCondition | XorCondition).right,
      variable,
    );

    const parts = [leftExtracted, rightExtracted].filter((c): c is Condition => c !== undefined);

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    if (condition.type === "AndCondition") {
      return {
        type: "AndCondition",
        left: parts[0]!,
        right: parts[1]!,
      } as AndCondition;
    } else if (condition.type === "OrCondition") {
      return {
        type: "OrCondition",
        left: parts[0]!,
        right: parts[1]!,
      } as OrCondition;
    } else {
      return {
        type: "XorCondition",
        left: parts[0]!,
        right: parts[1]!,
      } as XorCondition;
    }
  }

  // For simple conditions, check if they reference the target variable
  if (
    condition.type === "PropertyCondition" ||
    condition.type === "ExistsCondition" ||
    condition.type === "InCondition" ||
    condition.type === "IsNullCondition" ||
    condition.type === "RegexCondition" ||
    condition.type === "StringPredicateCondition"
  ) {
    const condVar = (
      condition as
        | PropertyCondition
        | ExistsCondition
        | InCondition
        | IsNullCondition
        | RegexCondition
        | StringPredicateCondition
    ).variable;
    if (condVar === variable) {
      return condition;
    }
  }

  if (condition.type === "NotCondition") {
    const inner = extractConditionsForVariable((condition as NotCondition).condition, variable);
    return inner ? ({ type: "NotCondition", condition: inner } as NotCondition) : undefined;
  }

  return undefined;
}

/**
 * Convert a pattern into a sequence of steps.
 * Handles node patterns, edge patterns, and variable-length paths.
 *
 * @param pattern The pattern to convert
 * @param whereClause Optional WHERE clause for filtering
 * @param anchoredToInput If true, the first node is a reference to an existing binding
 *                        (from a previous MATCH clause) and we should traverse from
 *                        the input path rather than fetching all vertices.
 * @param preservePriorBindings If true, use CartesianFetchStep instead of FetchVerticesStep
 *                              to preserve variable bindings from a prior WITH clause.
 */
export function convertPattern(
  pattern: Pattern,
  whereClause?: WhereClause,
  anchoredToInput: boolean = false,
  preservePriorBindings: boolean = false,
): Step<any>[] {
  const steps: Step<any>[] = [];
  const elements = pattern.elements;

  if (elements.length === 0) {
    throw new Error("Pattern must have at least one element");
  }

  // First element should be a NodePattern
  const firstElement = elements[0];
  if (firstElement?.type !== "NodePattern") {
    throw new Error("Pattern must start with a NodePattern");
  }

  const firstNode = firstElement as NodePattern;
  const stepLabels = firstNode.variable ? [firstNode.variable] : undefined;

  // Determine if this is an anchored pattern (variable reference to existing binding)
  // An anchored pattern has a variable but no labels and has more elements (edges)
  // In this case, we traverse from the input path rather than fetching all vertices.
  //
  // The heuristic only applies when anchoredToInput is explicitly true (passed from caller).
  // This handles cases like EXISTS { (n)-[:KNOWS]->(m) } where `n` is a bound variable.
  //
  // For fresh MATCH clauses, anchoredToInput is false, and we always create FetchVertices
  // even if the pattern looks like it could be anchored (e.g., MATCH (a)-[:knows]->(b)).
  // The label/property filter can come from the WHERE clause (e.g., WHERE a IS :Person).
  const isAnchorPattern =
    anchoredToInput &&
    firstNode.variable &&
    firstNode.labels.length === 0 &&
    !firstNode.labelExpression &&
    elements.length > 1 &&
    !firstNode.properties;

  if (!isAnchorPattern) {
    // Create initial fetch step for pattern match
    // Use CartesianFetchStep if we need to preserve bindings from a prior WITH clause
    if (preservePriorBindings) {
      steps.push(
        new CartesianFetchStep({
          vertexLabels: firstNode.labels.length > 0 ? firstNode.labels : undefined,
          stepLabels,
        }),
      );
    } else {
      steps.push(
        new FetchVerticesStep({
          vertexLabels: firstNode.labels.length > 0 ? firstNode.labels : undefined,
          stepLabels,
        }),
      );
    }

    // If there's a label expression on the first node, add a filter
    if (firstNode.labelExpression) {
      steps.push(
        new FilterElementsStep({
          condition: convertLabelExpression(firstNode.labelExpression),
        }),
      );
    }
  }
  // For anchor patterns, we skip FetchVertices and rely on the input path's value

  // Split WHERE clause into early and late conditions
  // Early conditions only reference the first node variable
  // Late conditions reference other variables or should be applied after traversal
  let earlyCondition: StepCondition | undefined;
  let lateCondition: StepCondition | undefined;

  if (whereClause && firstNode.variable) {
    const { early, late } = splitASTConditionByVariables(whereClause.condition, [
      firstNode.variable,
    ]);
    earlyCondition = early ? convertCondition(early) : undefined;
    lateCondition = late ? convertCondition(late) : undefined;
  } else if (whereClause) {
    // No first node variable, apply everything late
    lateCondition = convertCondition(whereClause.condition);
  }

  // Add early WHERE clause filter right after fetching starting vertices for better performance
  if (earlyCondition) {
    steps.push(new FilterElementsStep({ condition: earlyCondition }));
  }

  // Process remaining elements in pairs (edge, node) or ParenthesizedPathPattern
  for (let i = 1; i < elements.length; i++) {
    const element = elements[i]!;

    if (element.type === "EdgePattern") {
      const edgePattern = element as EdgePattern;
      const nextElement = elements[i + 1];

      // Handle the destination node if present
      const nodePattern =
        nextElement?.type === "NodePattern" ? (nextElement as NodePattern) : undefined;

      // Handle the edge traversal, passing the destination node info
      const edgeSteps = convertEdgePattern(edgePattern, nodePattern);
      steps.push(...edgeSteps);

      // Add filter for node labels if specified and not a quantified edge
      if (nodePattern && !edgePattern.quantifier) {
        const labelCondition = createNodeLabelCondition(nodePattern);
        if (labelCondition) {
          steps.push(
            new FilterElementsStep({
              condition: labelCondition,
            }),
          );
        }
      }

      if (nodePattern) {
        i++; // Skip the node since we've processed it
      }
    } else if (element.type === "ParenthesizedPathPattern") {
      // Handle parenthesized path pattern with optional inline WHERE
      const parenthesizedSteps = convertParenthesizedPathPattern(
        element as ParenthesizedPathPattern,
      );
      steps.push(...parenthesizedSteps);
    }
  }

  // If this pattern has a path variable (p = pattern), bind the path to that variable
  // This must happen BEFORE late WHERE conditions so that path functions like length(p) work
  if (pattern.pathVariable) {
    steps.push(new BindPathStep({ pathVariable: pattern.pathVariable }));
  }

  // Add late WHERE clause conditions that reference other variables
  if (lateCondition) {
    steps.push(new FilterElementsStep({ condition: lateCondition }));
  }

  return steps;
}

/**
 * Convert a MultiPattern (comma-separated patterns like MATCH (a), (b)) into steps.
 * Creates a Cartesian product of all matching combinations.
 *
 * Note: Currently only supports simple node patterns. Patterns with edges
 * (e.g., MATCH (a)-[:KNOWS]-(b), (c)) are not supported in comma-separated form.
 */
export function convertMultiPattern(
  multiPattern: MultiPattern,
  whereClause?: WhereClause,
  preservePriorBindings: boolean = false,
): Step<any>[] {
  const steps: Step<any>[] = [];
  const { patterns } = multiPattern;

  if (patterns.length === 0) {
    throw new Error("MultiPattern must have at least one pattern");
  }

  // Validate that all patterns are simple node patterns (no edges)
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]!;
    if (pattern.elements.length > 1) {
      throw new Error(
        `Comma-separated MATCH patterns only support simple node patterns. ` +
          `Pattern ${i + 1} contains edges which is not supported. ` +
          `Use separate MATCH clauses for patterns with relationships.`,
      );
    }
    if (pattern.elements[0]?.type !== "NodePattern") {
      throw new Error(
        `Comma-separated MATCH patterns must start with a NodePattern. ` +
          `Pattern ${i + 1} starts with ${pattern.elements[0]?.type ?? "nothing"}.`,
      );
    }
  }

  // Process first pattern normally
  const firstPattern = patterns[0]!;
  const firstNode = firstPattern.elements[0] as NodePattern;
  const firstStepLabels = firstNode.variable ? [firstNode.variable] : undefined;

  // Use CartesianFetchStep if we need to preserve bindings from a prior WITH clause
  if (preservePriorBindings) {
    steps.push(
      new CartesianFetchStep({
        vertexLabels: firstNode.labels.length > 0 ? firstNode.labels : undefined,
        stepLabels: firstStepLabels,
      }),
    );
  } else {
    steps.push(
      new FetchVerticesStep({
        vertexLabels: firstNode.labels.length > 0 ? firstNode.labels : undefined,
        stepLabels: firstStepLabels,
      }),
    );
  }

  // If there's a label expression on the first node, add a filter
  if (firstNode.labelExpression) {
    steps.push(
      new FilterElementsStep({
        condition: convertLabelExpression(firstNode.labelExpression),
      }),
    );
  }

  // Apply property filters for first node if it has inline properties
  if (firstNode.properties && Object.keys(firstNode.properties).length > 0) {
    const propertyConditions = Object.entries(firstNode.properties).map(
      ([key, value]) => ["=", key, value] as StepCondition,
    );
    const condition: StepCondition =
      propertyConditions.length === 1
        ? propertyConditions[0]!
        : (["and", ...propertyConditions] as StepCondition);
    steps.push(new FilterElementsStep({ condition }));
  }

  // Process additional patterns using CartesianFetchStep for cross-product
  for (let i = 1; i < patterns.length; i++) {
    const pattern = patterns[i]!;
    const node = pattern.elements[0] as NodePattern;
    const stepLabels = node.variable ? [node.variable] : undefined;

    // Convert inline properties to a condition for consistency with FilterElementsStep
    let condition: StepCondition | undefined;
    if (node.properties && Object.keys(node.properties).length > 0) {
      const propertyConditions = Object.entries(node.properties).map(
        ([key, value]) => ["=", key, value] as StepCondition,
      );
      condition =
        propertyConditions.length === 1
          ? propertyConditions[0]!
          : (["and", ...propertyConditions] as StepCondition);
    }

    steps.push(
      new CartesianFetchStep({
        vertexLabels: node.labels.length > 0 ? node.labels : undefined,
        condition,
        stepLabels,
      }),
    );
  }

  // Apply WHERE clause conditions at the end
  if (whereClause) {
    const condition = convertCondition(whereClause.condition);
    steps.push(new FilterElementsStep({ condition }));
  }

  return steps;
}

/**
 * Convert an edge pattern to steps, handling quantifiers for variable-length paths.
 */
export function convertEdgePattern(edgePattern: EdgePattern, destNode?: NodePattern): Step<any>[] {
  // No quantifier - single edge traversal + destination vertex
  if (!edgePattern.quantifier) {
    const baseStep = new EdgeStep({
      direction: edgePattern.direction,
      edgeLabels: edgePattern.labels,
      stepLabels: edgePattern.variable ? [edgePattern.variable] : undefined,
    });

    const steps: Step<any>[] = [baseStep];

    // Add filter for edge properties if specified
    if (edgePattern.properties && Object.keys(edgePattern.properties).length > 0) {
      const propertyConditions = Object.entries(edgePattern.properties).map(
        ([key, value]) => ["=", key, value] as StepCondition,
      );
      const condition: StepCondition =
        propertyConditions.length === 1
          ? propertyConditions[0]!
          : (["and", ...propertyConditions] as StepCondition);
      steps.push(new FilterElementsStep({ condition }));
    }

    // Add VertexStep with "other" direction to traverse to the destination vertex
    if (destNode) {
      steps.push(
        new VertexStep({
          direction: "other",
          edgeLabels: [],
          stepLabels: destNode.variable ? [destNode.variable] : undefined,
        }),
      );
    }

    return steps;
  }

  // With quantifier - wrap in RepeatStep with destination node label
  const baseStep = new EdgeStep({
    direction: edgePattern.direction,
    edgeLabels: edgePattern.labels,
    stepLabels: edgePattern.variable ? [edgePattern.variable] : undefined,
  });

  const repeatStep = convertQuantifiedEdge(
    baseStep,
    edgePattern.quantifier,
    destNode?.variable,
    edgePattern.properties,
  );

  return [repeatStep];
}

/**
 * Convert a quantified edge pattern to a RepeatStep.
 * For variable-length paths, we need to repeat both the edge traversal and vertex traversal.
 */
export function convertQuantifiedEdge(
  baseStep: EdgeStep,
  quantifier: Quantifier,
  destNodeVariable?: string,
  edgeProperties?: { [key: string]: any },
): RepeatStep<Step<any>[]> {
  const { min, max } = quantifier;

  // Build the steps for each iteration
  const iterationSteps: Step<any>[] = [baseStep];

  // Add filter for edge properties if specified
  if (edgeProperties && Object.keys(edgeProperties).length > 0) {
    const propertyConditions = Object.entries(edgeProperties).map(
      ([key, value]) => ["=", key, value] as StepCondition,
    );
    const condition: StepCondition =
      propertyConditions.length === 1
        ? propertyConditions[0]!
        : (["and", ...propertyConditions] as StepCondition);
    iterationSteps.push(new FilterElementsStep({ condition }));
  }

  // For variable-length paths, we need to traverse edge -> vertex repeatedly
  // The vertex step should use the same direction as the edge step to continue in that direction
  const vertexStep = new VertexStep({
    direction: baseStep.config.direction,
    edgeLabels: [],
  });
  iterationSteps.push(vertexStep);

  const stepLabels = destNodeVariable ? [destNodeVariable] : undefined;

  // Handle zero-min case: {0,n} or {0} includes the starting node
  const emitInput = min === 0;
  // emitStart is 1-indexed (iteration 1 = 1 hop), so set it to min (but at least 1)
  const effectiveMin = min ?? 1;
  const emitStart = effectiveMin > 0 ? effectiveMin : 1;

  // Exact count: *2 or {2} means exactly 2 hops
  if (max !== undefined && effectiveMin === max) {
    // For exact count with zero min, we need emit to also get the input
    if (emitInput) {
      return new RepeatStep({ times: max, stepLabels, emitInput }, iterationSteps);
    }
    return new RepeatStep({ times: max, stepLabels }, iterationSteps);
  }

  // Range: *1..3 or {1,3} means 1 to 3 hops (with emitStart respecting min)
  if (max !== undefined) {
    return new RepeatStep(
      { times: max, emit: true, emitStart, emitInput, stepLabels },
      iterationSteps,
    );
  }

  // Open-ended: *2.. or {2,} means 2 or more hops
  // Use a large number for open-ended paths
  return new RepeatStep(
    { times: 100, emit: true, emitStart, emitInput, stepLabels },
    iterationSteps,
  );
}

/**
 * Convert a parenthesized path pattern to steps.
 * Handles optional inline WHERE condition and quantifiers.
 *
 * Parenthesized path patterns allow grouping patterns with inline conditions:
 * - ((a)-[r]->(b) WHERE r.weight > 10) - pattern with inline condition
 * - ((a)-[r]->(b))+ - quantified pattern (one or more)
 * - ((a)-[r]->(b) WHERE r.weight > 10){2,5} - with condition and quantifier
 */
export function convertParenthesizedPathPattern(parenthesized: ParenthesizedPathPattern): Step<any>[] {
  // Convert the inner pattern to steps WITHOUT the WHERE clause
  // The WHERE will be added after the pattern traversal
  const patternSteps = convertPattern(
    parenthesized.pattern,
    undefined, // Don't pass WHERE here, we'll add it manually
    true,
  );

  // Build the complete inner steps array
  const innerSteps: Step<any>[] = [...patternSteps];

  // Add inline WHERE condition as a filter at the end of the inner pattern
  // This ensures the condition is checked after each traversal iteration
  if (parenthesized.where) {
    innerSteps.push(
      new FilterElementsStep({
        condition: convertCondition(parenthesized.where),
      }),
    );
  }

  // If there's a quantifier, wrap in RepeatStep
  if (parenthesized.quantifier) {
    const { min, max } = parenthesized.quantifier;

    // Extract the last variable from the pattern for step labels
    const lastElement = parenthesized.pattern.elements[parenthesized.pattern.elements.length - 1];
    const stepLabels =
      lastElement?.type === "NodePattern" && lastElement.variable
        ? [lastElement.variable]
        : undefined;

    // Handle zero-min case
    const emitInput = min === 0;
    const effectiveMin = min ?? 1;
    const emitStart = effectiveMin > 0 ? effectiveMin : 1;

    // Exact count
    if (max !== undefined && effectiveMin === max) {
      if (emitInput) {
        return [new RepeatStep({ times: max, stepLabels, emitInput }, innerSteps)];
      }
      return [new RepeatStep({ times: max, stepLabels }, innerSteps)];
    }

    // Range
    if (max !== undefined) {
      return [
        new RepeatStep({ times: max, emit: true, emitStart, emitInput, stepLabels }, innerSteps),
      ];
    }

    // Open-ended
    return [
      new RepeatStep({ times: 100, emit: true, emitStart, emitInput, stepLabels }, innerSteps),
    ];
  }

  // No quantifier - just return the inner steps
  return innerSteps;
}

/**
 * Split an AST condition into early and late parts based on which variables are referenced.
 * Early conditions only reference variables in the allowedVariables list.
 * Late conditions reference other variables.
 */
export function splitASTConditionByVariables(
  condition: Condition,
  allowedVariables: string[],
): { early?: Condition; late?: Condition } {
  // Handle logical operators (and, or, xor)
  if (
    condition.type === "AndCondition" ||
    condition.type === "OrCondition" ||
    condition.type === "XorCondition"
  ) {
    const leftSplit = splitASTConditionByVariables(
      (condition as AndCondition | OrCondition | XorCondition).left,
      allowedVariables,
    );
    const rightSplit = splitASTConditionByVariables(
      (condition as AndCondition | OrCondition | XorCondition).right,
      allowedVariables,
    );

    const earlyParts = [leftSplit.early, rightSplit.early].filter(
      (c): c is Condition => c !== undefined,
    );
    const lateParts = [leftSplit.late, rightSplit.late].filter(
      (c): c is Condition => c !== undefined,
    );

    const buildCondition = (parts: Condition[], type: string): Condition => {
      if (type === "AndCondition") {
        return {
          type: "AndCondition",
          left: parts[0]!,
          right: parts[1]!,
        } as AndCondition;
      } else if (type === "OrCondition") {
        return {
          type: "OrCondition",
          left: parts[0]!,
          right: parts[1]!,
        } as OrCondition;
      } else {
        return {
          type: "XorCondition",
          left: parts[0]!,
          right: parts[1]!,
        } as XorCondition;
      }
    };

    const early =
      earlyParts.length === 0
        ? undefined
        : earlyParts.length === 1
          ? earlyParts[0]
          : buildCondition(earlyParts, condition.type);

    const late =
      lateParts.length === 0
        ? undefined
        : lateParts.length === 1
          ? lateParts[0]
          : buildCondition(lateParts, condition.type);

    return { early, late };
  }

  // For PropertyCondition, ExistsCondition, InCondition, IsNullCondition, RegexCondition, StringPredicateCondition, check the variable field
  if (
    condition.type === "PropertyCondition" ||
    condition.type === "ExistsCondition" ||
    condition.type === "InCondition" ||
    condition.type === "IsNullCondition" ||
    condition.type === "RegexCondition" ||
    condition.type === "StringPredicateCondition"
  ) {
    const variable = (
      condition as
        | PropertyCondition
        | ExistsCondition
        | InCondition
        | IsNullCondition
        | RegexCondition
        | StringPredicateCondition
    ).variable;
    if (allowedVariables.includes(variable)) {
      return { early: condition };
    } else {
      return { late: condition };
    }
  }

  // For IsLabeledCondition, check the variable field
  if (condition.type === "IsLabeledCondition") {
    const isLabeledCondition = condition as import("../../AST.js").IsLabeledCondition;
    if (allowedVariables.includes(isLabeledCondition.variable)) {
      return { early: condition };
    } else {
      return { late: condition };
    }
  }

  // For NotCondition, recursively split the inner condition
  if (condition.type === "NotCondition") {
    const notCondition = condition as NotCondition;
    const split = splitASTConditionByVariables(notCondition.condition, allowedVariables);
    return {
      early: split.early
        ? ({ type: "NotCondition", condition: split.early } as NotCondition)
        : undefined,
      late: split.late
        ? ({ type: "NotCondition", condition: split.late } as NotCondition)
        : undefined,
    };
  }

  // Unknown condition type, apply late to be safe
  return { late: condition };
}

/**
 * Create a condition that checks if an element has one of the specified labels.
 */
export function createLabelCondition(labels: string[]): StepCondition {
  if (labels.length === 0) {
    throw new Error("Cannot create label condition with empty labels array");
  }

  if (labels.length === 1) {
    return ["=", "@label", labels[0]!] as StepCondition;
  }

  // Multiple labels - create OR condition
  const conditions = labels.map((label) => ["=", "@label", label] as StepCondition);

  return conditions.reduce((acc, condition) => {
    return ["or", acc, condition] as StepCondition;
  });
}

/**
 * Convert a LabelExpression AST node to a StepCondition.
 * Supports: LabelName, LabelOr, LabelAnd, LabelNot, LabelWildcard
 */
export function convertLabelExpression(expr: LabelExpression): StepCondition {
  switch (expr.type) {
    case "LabelName":
      return ["=", "@label", expr.name] as StepCondition;

    case "LabelOr":
      return [
        "or",
        convertLabelExpression(expr.left),
        convertLabelExpression(expr.right),
      ] as StepCondition;

    case "LabelAnd":
      return [
        "and",
        convertLabelExpression(expr.left),
        convertLabelExpression(expr.right),
      ] as StepCondition;

    case "LabelNot":
      return ["not", convertLabelExpression(expr.expression)] as StepCondition;

    case "LabelWildcard":
      // Wildcard matches any label - represented as "has a label" check
      return ["labelWildcard"] as StepCondition;

    default: {
      // Exhaustive check
      const _exhaustive: never = expr;
      throw new Error(`Unknown label expression type: ${(_exhaustive as any).type}`);
    }
  }
}

/**
 * Create a label condition from either simple labels or a label expression.
 * Returns null if no label filtering is needed.
 */
export function createNodeLabelCondition(
  node: NodePattern | { labels: string[]; labelExpression?: LabelExpression },
): StepCondition | null {
  if (node.labelExpression) {
    return convertLabelExpression(node.labelExpression);
  }
  if (node.labels.length > 0) {
    return createLabelCondition(node.labels);
  }
  return null;
}

/**
 * Convert an AST condition value to Step condition value format.
 * Handles literal values, property references, variable references, and arithmetic expressions.
 */
export function convertConditionValue(
  value: import("../../AST.js").ConditionValue,
): import("../../Steps.js").ConditionValue {
  // Literal values (string, number, boolean, null) are passed through as-is
  if (value === null || typeof value !== "object") {
    return value;
  }

  // Object values are references or expressions
  if (value.type === "PropertyAccess") {
    return {
      type: "propertyRef",
      variable: value.variable,
      property: value.property,
    };
  }

  if (value.type === "VariableRef") {
    return {
      type: "variableRef",
      variable: value.variable,
    };
  }

  if (value.type === "ParameterRef") {
    return {
      type: "parameterRef",
      name: value.name,
    };
  }

  if (value.type === "ArithmeticExpression") {
    return {
      type: "arithmeticExpression",
      operator: value.operator,
      left: convertConditionValue(value.left),
      right: convertConditionValue(value.right),
    };
  }

  if (value.type === "BooleanExpression") {
    // Handle boolean operators: AND, OR, XOR, NOT
    if (value.operator === "NOT") {
      return {
        type: "booleanExpression",
        operator: "NOT",
        operand: convertConditionValue(
          (value as { operand: import("../../AST.js").ConditionValue }).operand,
        ),
      };
    }
    // For binary operators (AND, OR, XOR), left and right are always present
    return {
      type: "booleanExpression",
      operator: value.operator,
      left: convertConditionValue(value.left!),
      right: convertConditionValue(value.right!),
    };
  }

  if (value.type === "ComparisonExpression") {
    // Handle comparison operators: =, <>, <, <=, >, >=, IS NULL, IS NOT NULL, IN, NOT IN
    if (value.operator === "IS NULL" || value.operator === "IS NOT NULL") {
      return {
        type: "comparisonExpression",
        operator: value.operator,
        left: convertConditionValue(value.left),
      };
    }
    // For binary comparison operators, right is always present
    return {
      type: "comparisonExpression",
      operator: value.operator,
      left: convertConditionValue(value.left),
      right: convertConditionValue(value.right!),
    };
  }

  if (value.type === "UnaryExpression") {
    return {
      type: "unaryExpression",
      operator: value.operator,
      operand: convertConditionValue(value.operand),
    };
  }

  if (value.type === "FunctionCall") {
    return {
      type: "functionCall",
      name: value.name,
      args: value.args.map((arg, index) => {
        // Check if this argument position expects a path
        // If so, and the argument is a VariableRef, convert it to pathRef
        if (
          functionArgExpectsPath(value.name, index) &&
          arg !== null &&
          typeof arg === "object" &&
          "type" in arg &&
          arg.type === "VariableRef"
        ) {
          return { type: "pathRef" as const, variable: arg.variable };
        }
        return convertConditionValue(arg);
      }),
      distinct: value.distinct,
    };
  }

  if (value.type === "SimpleCaseExpression") {
    return {
      type: "simpleCaseExpression",
      test: convertConditionValue(value.test),
      alternatives: value.alternatives.map((alt) => ({
        when: convertConditionValue(alt.when),
        // eslint-disable-next-line no-thenable
        then: convertConditionValue(alt.then),
      })),
      ...(value.else !== undefined && {
        else: convertConditionValue(value.else),
      }),
    };
  }

  if (value.type === "SearchedCaseExpression") {
    return {
      type: "searchedCaseExpression",
      alternatives: value.alternatives.map((alt) => ({
        when: convertCondition(alt.when),
        // eslint-disable-next-line no-thenable
        then: convertConditionValue(alt.then),
      })),
      ...(value.else !== undefined && {
        else: convertConditionValue(value.else),
      }),
    };
  }

  if (value.type === "ListLiteral") {
    return {
      type: "listLiteral",
      values: value.values.map((v) =>
        convertConditionValue(v as import("../../AST.js").ConditionValue),
      ),
    };
  }

  if (value.type === "MapLiteral") {
    return {
      type: "mapLiteral",
      entries: value.entries.map((entry) => ({
        key: entry.key,
        value: convertConditionValue(entry.value as import("../../AST.js").ConditionValue),
      })),
    };
  }

  if (value.type === "ListIndexExpression") {
    return {
      type: "listIndexExpression",
      list: convertConditionValue(value.list),
      index: convertConditionValue(value.index),
    };
  }

  if (value.type === "SliceExpression") {
    return {
      type: "sliceExpression",
      list: convertConditionValue(value.list),
      ...(value.start !== undefined && {
        start: convertConditionValue(value.start),
      }),
      ...(value.end !== undefined && { end: convertConditionValue(value.end) }),
    };
  }

  if (value.type === "DynamicPropertyAccess") {
    return {
      type: "dynamicPropertyAccess",
      object: convertConditionValue(value.object),
      property: convertConditionValue(value.property),
    };
  }

  if (value.type === "MemberAccess") {
    return {
      type: "memberAccess",
      object: convertConditionValue(value.object),
      property: value.property,
    };
  }

  if (value.type === "ListComprehension") {
    return {
      type: "listComprehension",
      variable: value.variable,
      list: convertConditionValue(value.list),
      ...(value.filterCondition && {
        filterCondition: convertCondition(value.filterCondition),
      }),
      ...(value.projection && {
        projection: convertConditionValue(value.projection),
      }),
    };
  }

  if (value.type === "QuantifierExpression") {
    return {
      type: "quantifierExpression",
      quantifier: value.quantifier,
      variable: value.variable,
      list: convertConditionValue(value.list),
      condition: convertCondition(value.condition),
    };
  }

  if (value.type === "ReduceExpression") {
    return {
      type: "reduceExpression",
      accumulator: value.accumulator,
      init: convertConditionValue(value.init),
      variable: value.variable,
      list: convertConditionValue(value.list),
      expression: convertConditionValue(value.expression),
    };
  }

  if (value.type === "PatternComprehension") {
    // Convert pattern to steps - pattern comprehensions may reference outer scope variables
    // via patterns like (n)-[:KNOWS]->(m) where n is bound from outer context.
    // Pass anchoredToInput: true to enable anchor detection for such patterns.
    const patternSteps = convertPattern(value.pattern, undefined, true);

    return {
      type: "patternComprehension",
      ...(value.pathVariable && { pathVariable: value.pathVariable }),
      patternSteps,
      ...(value.filterCondition && {
        filterCondition: convertCondition(value.filterCondition),
      }),
      projection: convertConditionValue(value.projection),
    };
  }

  if (value.type === "MapProjection") {
    // Convert map projection: variable{.prop, key: expr, .*}
    const selectors = value.selectors.map((selector) => {
      if (selector.type === "MapAllPropertiesSelector") {
        return { type: "allProperties" as const };
      } else if (selector.type === "MapPropertySelector") {
        return { type: "property" as const, property: selector.property };
      } else if (selector.type === "MapLiteralEntry") {
        return {
          type: "literalEntry" as const,
          key: selector.key,
          value: convertConditionValue(selector.value),
        };
      } else if (selector.type === "MapVariableSelector") {
        return { type: "variable" as const, variable: selector.variable };
      }
      throw new Error(`Unknown map projection selector type: ${(selector as any).type}`);
    });

    return {
      type: "mapProjection",
      variable: value.variable,
      selectors,
    };
  }

  if (value.type === "ExistsSubquery") {
    // Convert EXISTS subquery: EXISTS { pattern [WHERE cond] }
    // EXISTS subqueries may reference outer scope variables via patterns like
    // (n)-[:KNOWS]->(m) where n is bound from outer context.
    // Pass anchoredToInput: true to enable anchor detection for such patterns.
    const patternSteps = convertPattern(value.pattern, undefined, true);

    return {
      type: "existsSubquery",
      patternSteps,
      ...(value.filterCondition && {
        filterCondition: convertCondition(value.filterCondition),
      }),
    };
  }

  // Shouldn't reach here, but fall back to returning the value
  return value as any;
}

/**
 * Convert AST condition to Step condition format.
 * @param condition - The AST condition to convert
 * @param useDirectPropertyAccess - If true, use direct property access (e.g., for shortestPath target conditions)
 *                                  instead of propertyRef (which requires variable bindings)
 */
export function convertCondition(
  condition: Condition,
  useDirectPropertyAccess: boolean = false,
): StepCondition {
  switch (condition.type) {
    case "PropertyCondition": {
      const propCondition = condition as PropertyCondition;
      // Convert the condition value - handle variable and property references
      const conditionValue = convertConditionValue(propCondition.value);

      // When useDirectPropertyAccess is true (e.g., shortestPath target conditions),
      // use simple property access that evaluates against the current vertex
      if (useDirectPropertyAccess) {
        return [propCondition.operator, propCondition.property, conditionValue] as StepCondition;
      }

      // Use ExpressionCondition with propertyRef to properly resolve the variable
      // This ensures the condition looks up the variable from the path bindings
      // rather than assuming the current element
      return [
        "expr",
        propCondition.operator as BinaryOperator,
        {
          type: "propertyRef",
          variable: propCondition.variable,
          property: propCondition.property,
        },
        conditionValue,
      ] as StepCondition;
    }

    case "ExistsCondition": {
      const existsCondition = condition as ExistsCondition;
      return ["exists", existsCondition.property] as StepCondition;
    }

    case "AndCondition": {
      const andCondition = condition as AndCondition;
      return [
        "and",
        convertCondition(andCondition.left, useDirectPropertyAccess),
        convertCondition(andCondition.right, useDirectPropertyAccess),
      ] as StepCondition;
    }

    case "OrCondition": {
      const orCondition = condition as OrCondition;
      return [
        "or",
        convertCondition(orCondition.left, useDirectPropertyAccess),
        convertCondition(orCondition.right, useDirectPropertyAccess),
      ] as StepCondition;
    }

    case "XorCondition": {
      const xorCondition = condition as XorCondition;
      return [
        "xor",
        convertCondition(xorCondition.left, useDirectPropertyAccess),
        convertCondition(xorCondition.right, useDirectPropertyAccess),
      ] as StepCondition;
    }

    case "NotCondition": {
      const notCondition = condition as NotCondition;
      return [
        "not",
        convertCondition(notCondition.condition, useDirectPropertyAccess),
      ] as StepCondition;
    }

    case "InCondition": {
      const inCondition = condition as InCondition;
      return ["in", inCondition.property, inCondition.values] as StepCondition;
    }

    case "IsNullCondition": {
      const isNullCondition = condition as IsNullCondition;
      return [
        isNullCondition.negated ? "isNotNull" : "isNull",
        isNullCondition.property,
      ] as StepCondition;
    }

    case "RegexCondition": {
      const regexCondition = condition as RegexCondition;
      return ["=~", regexCondition.property, regexCondition.pattern] as StepCondition;
    }

    case "StringPredicateCondition": {
      const stringCondition = condition as StringPredicateCondition;
      // Map Cypher predicates to our operators
      const operatorMap: Record<string, BinaryOperator> = {
        "STARTS WITH": "startsWith",
        "ENDS WITH": "endsWith",
        CONTAINS: "contains",
      };
      return [
        operatorMap[stringCondition.predicate]!,
        stringCondition.property,
        stringCondition.value,
      ] as StepCondition;
    }

    case "ExpressionCondition": {
      const exprCondition = condition as ASTExpressionCondition;
      return [
        "expr",
        exprCondition.operator as BinaryOperator,
        convertConditionValue(exprCondition.left),
        convertConditionValue(exprCondition.right),
      ] as StepCondition;
    }

    case "IsLabeledCondition": {
      // IS LABELED condition: check if a variable has a specific label
      const isLabeledCondition = condition as import("../../AST.js").IsLabeledCondition;
      return [
        "isLabeled",
        isLabeledCondition.variable,
        convertLabelExpression(isLabeledCondition.labelExpression),
      ] as StepCondition;
    }

    default:
      throw new Error(`Unknown condition type: ${(condition as any).type}`);
  }
}

/**
 * Extract all bound variables from a query's MATCH, WITH, and UNWIND clauses.
 */
