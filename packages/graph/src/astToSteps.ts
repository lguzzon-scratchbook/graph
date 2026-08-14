import type {
  Query,
  QuerySegment,
  UnionQuery,
  MultiStatement,
  Pattern,
  NodePattern,
  EdgePattern,
  Condition,
  ShortestPathPattern,
  SetClause,
  ForeachClause,
  SetOperation as ASTSetOperation,
  DeleteOperation as ASTDeleteOperation,
  ListExpression,
  MatchClause,
  MergeClause,
  MultiPattern,
  WithClause,
  WithItem,
  CallClause,
  YieldItem,
  ParenthesizedPathPattern,
  FunctionCall,
  OrderItem,
  ReturnClause,
} from "./AST.js";
import {
  Step,
  FetchVerticesStep,
  VertexStep,
  EdgeStep,
  FilterElementsStep,
  RangeStep,
  OrderStep,
  CountStep,
  MultiQueryStep,
  SumStep,
  AvgStep,
  MinStep,
  MaxStep,
  CollectStep,
  DedupStep,
  ValuesStep,
  PropertyValuesStep,
  LabelsStep,
  SetStep,
  ForeachStep,
  DeleteStep,
  StartStep,
  DrainStep,
  WithStep,
  CallStep,
  QueryUnionStep,
  GroupByStep,
  type ConditionValue,
  type YieldItemConfig,
  type OrderDirection,
  type ForeachListExpression,
  type WithItemConfig,
  SelectStep,
  OptionalMatchStep,
  ExpressionReturnStep,
  type ExpressionReturnItem,
} from "./Steps.js";
import { convertSetValue } from "./steps/shared/astToStepsHelpers.js";
import {
  convertPattern,
  convertMultiPattern,
  convertShortestPathPattern,
  convertEdgePattern,
  convertQuantifiedEdge,
  convertParenthesizedPathPattern,
  splitASTConditionByVariables,
  createLabelCondition,
  convertLabelExpression,
  createNodeLabelCondition,
  convertConditionValue,
  convertCondition,
  extractConditionsForVariable,
} from "./steps/shared/patternToSteps.js";
import { SetStep as MutSetStep } from "./steps/mutation/SetStep.js";
import { CreateStep as MutCreateStep } from "./steps/mutation/CreateStep.js";
import { DeleteStep as MutDeleteStep } from "./steps/mutation/DeleteStep.js";
import { RemoveStep as MutRemoveStep } from "./steps/mutation/RemoveStep.js";
import { MergeStep as MutMergeStep } from "./steps/mutation/MergeStep.js";
import { UnwindStep as MutUnwindStep } from "./steps/control/UnwindStep.js";
import type { ASTConversionContext } from "./steps/StepRegistry.js";

/**
 * Lazily-shared conversion context. None of the mutation conversions resolve
 * parameters or consult bound variables, so a single empty context is reused
 * across all fromAST calls in a conversion pass.
 */
const MUTATION_CONVERSION_CONTEXT: ASTConversionContext = {
  boundVariables: new Set<string>(),
  schema: undefined,
};

/**
 * The mutation step classes that implement `static fromAST`, keyed by the
 * step name each wrapper registers under. The dispatcher routes each
 * mutation-clause AST node here; conversion lives in the step's own module.
 */
type FromASTStep = typeof MutSetStep | typeof MutCreateStep | typeof MutDeleteStep |
  typeof MutRemoveStep | typeof MutMergeStep;

const MUTATION_FROM_AST: Record<string, FromASTStep> = {
  Set: MutSetStep,
  Create: MutCreateStep,
  Delete: MutDeleteStep,
  Remove: MutRemoveStep,
  Merge: MutMergeStep,
};

/**
 * Convert a mutation-clause AST node using the step's `fromAST`.
 * @param name The registry step name (e.g. "Set", "Create").
 * @param clause The mutation-clause AST node (e.g. a SetClause).
 */
function dispatchMutationFromAST(name: string, clause: unknown): import("./Steps.js").Step<any> {
  const ctor = MUTATION_FROM_AST[name];
  if (!ctor) {
    throw new Error(`No fromAST converter registered for mutation step "${name}"`);
  }
  const step = ctor.fromAST(clause as never, MUTATION_CONVERSION_CONTEXT);
  if (!step) {
    throw new Error(`fromAST for mutation step "${name}" returned null`);
  }
  return step;
}

/**
 * Convert a parsed query AST into an array of Step instances
 * that can be executed against the graph database.
 *
 * Clause Ordering: When segments are present, clauses are processed in segment order
 * to support flexible query patterns like: MATCH...CREATE...WITH...MATCH...CREATE...
 *
 * For backward compatibility with flat queries (no segments), the traditional order is:
 *   1. MATCH - pattern matching
 *   2. FOREACH - iteration with nested mutations
 *   3. MERGE - upsert operations (before CREATE to allow MERGE to establish nodes)
 *   4. CREATE - create new vertices/edges
 *   5. SET - update properties
 *   6. REMOVE - remove properties
 *   7. DELETE - remove vertices/edges
 *   8. ORDER BY - sort results
 *   9. SKIP/LIMIT - pagination
 *   10. RETURN - project results
 *
 * This ensures predictable mutation ordering (e.g., MERGE before CREATE, SET before DELETE).
 */
export function astToSteps(query: Query): readonly Step<any>[] {
  const steps: Step<any>[] = [];

  // Validation: ORDER BY, SKIP, and LIMIT require a RETURN clause
  if (!query.return && (query.orderBy || query.skip !== undefined || query.limit !== undefined)) {
    throw new Error("ORDER BY, SKIP, and LIMIT require a RETURN clause");
  }

  // If we have segments, process them in order for proper execution sequencing
  if (query.segments && query.segments.length > 0) {
    processQuerySegments(query.segments, steps);
  } else if (query.return) {
    // RETURN-only query (no segments): add StartStep to provide initial path
    steps.push(new StartStep({}));
  } else {
    // Backward compatibility: use flat structure
    processLegacyQuery(query, steps);
  }

  // Handle ORDER BY
  if (query.orderBy) {
    // Build alias map from RETURN items for alias resolution
    const aliasMap = buildReturnAliasMap(query.return);
    const directions = query.orderBy.orders.map(
      (order) => resolveOrderItem(order, aliasMap, false), // false = use source property/variable for RETURN ORDER BY
    );
    steps.push(new OrderStep({ directions }));
  }

  // Handle SKIP and LIMIT with RangeStep
  if (query.skip !== undefined || query.limit !== undefined) {
    const start = query.skip ?? 0;
    const end = query.limit !== undefined ? start + query.limit : Number.MAX_SAFE_INTEGER;
    steps.push(new RangeStep({ start, end }));
  }

  // Handle RETURN clause
  const returnSteps = convertReturnClause(query);
  steps.push(...returnSteps);

  return steps;
}

/**
 * Process query segments in order for flexible clause ordering.
 * Each segment can contain MATCH, mutations, and a WITH clause that transitions to the next segment.
 */
function processQuerySegments(segments: QuerySegment[], steps: Step<any>[]): void {
  let isFirstSegment = true;
  let hasSeenNonOptionalMatch = false;
  let hasSeenWithClause = false;

  for (const segment of segments) {
    // Check if this segment has any content (MATCH, mutations, or list operations)
    const hasMatches = segment.matches && segment.matches.length > 0;
    const hasMutations = segment.mutations && segment.mutations.length > 0;
    const hasUnwind = segment.unwind && segment.unwind.length > 0;
    const hasCall = segment.call && segment.call.length > 0;
    const hasForeach = segment.foreach && segment.foreach.length > 0;
    const hasSet = segment.set;
    const hasRemove = segment.remove;
    const hasDelete = segment.delete;
    const hasWithClause = segment.with && segment.with.length > 0;

    const hasContent =
      hasMatches ||
      hasMutations ||
      hasUnwind ||
      hasCall ||
      hasForeach ||
      hasSet ||
      hasRemove ||
      hasDelete ||
      hasWithClause;

    // Check if the first MATCH in this segment is OPTIONAL
    const firstMatchIsOptional = hasMatches && segment.matches![0]!.optional === true;

    // For the first segment with no MATCH but mutations/list ops/WITH, add StartStep
    // Also add StartStep if the first MATCH is OPTIONAL (needs input path for null bindings)
    if (isFirstSegment && ((!hasMatches && hasContent) || firstMatchIsOptional)) {
      steps.push(new StartStep({}));
    }
    isFirstSegment = false;

    // Process MATCH clauses for this segment
    if (hasMatches) {
      for (const matchClause of segment.matches!) {
        let patternSteps: Step<any>[];

        if (matchClause.pattern.type === "ShortestPathPattern") {
          patternSteps = convertShortestPathPattern(
            matchClause.pattern as ShortestPathPattern,
            matchClause.where,
          );
        } else if (matchClause.pattern.type === "MultiPattern") {
          patternSteps = convertMultiPattern(
            matchClause.pattern as MultiPattern,
            matchClause.where,
            hasSeenWithClause, // Preserve bindings from prior WITH clause
          );
        } else {
          // After a WITH clause or non-optional MATCH, MATCH can reference variables
          const isAnchoredContext = matchClause.optional && hasSeenNonOptionalMatch;
          patternSteps = convertPattern(
            matchClause.pattern as Pattern,
            matchClause.where,
            isAnchoredContext,
            hasSeenWithClause, // Preserve bindings from prior WITH clause
          );
        }

        if (matchClause.optional) {
          // skipAnchor: Only skip anchor if there was a previous non-optional MATCH
          const skipAnchor = hasSeenNonOptionalMatch;
          const variables = extractPatternVariables(matchClause.pattern, skipAnchor);
          steps.push(new OptionalMatchStep({ variables }, patternSteps as Step<any>[]));
        } else {
          steps.push(...patternSteps);
          hasSeenNonOptionalMatch = true;
        }
      }
    }

    // Process UNWIND clauses
    if (hasUnwind) {
      for (const unwindClause of segment.unwind!) {
        steps.push(MutUnwindStep.fromAST(unwindClause, MUTATION_CONVERSION_CONTEXT));
      }
    }

    // Process CALL clauses
    if (hasCall) {
      for (const callClause of segment.call!) {
        const callStep = convertCallClause(callClause);
        steps.push(callStep);
      }
    }

    // Process FOREACH clauses
    if (hasForeach) {
      for (const foreachClause of segment.foreach!) {
        const foreachStep = convertForeachClause(foreachClause);
        steps.push(foreachStep);
      }
    }

    // Process mutations (MERGE and CREATE) in their original order
    if (hasMutations) {
      for (const mutation of segment.mutations!) {
        steps.push(
          dispatchMutationFromAST(
            mutation.type === "MergeClause" ? "Merge" : "Create",
            mutation,
          )!,
        );
      }
    }

    // Process SET clause
    if (hasSet) {
      steps.push(dispatchMutationFromAST("Set", segment.set!)!);
    }

    // Process REMOVE clause
    if (hasRemove) {
      steps.push(dispatchMutationFromAST("Remove", segment.remove!)!);
    }

    // Process DELETE clause
    if (hasDelete) {
      steps.push(dispatchMutationFromAST("Delete", segment.delete!)!);
    }

    // Process WITH clause (transitions to next segment)
    if (hasWithClause) {
      for (const withClause of segment.with!) {
        const withStep = convertWithClause(withClause);
        steps.push(withStep);
      }
      hasSeenWithClause = true;
    }
  }
}

/**
 * Process a query using the legacy flat structure (backward compatibility).
 */
function processLegacyQuery(query: Query, steps: Step<any>[]): void {
  // 1. Convert MATCH clauses patterns to steps
  // Process regular MATCH clauses first, then OPTIONAL MATCH clauses
  // If the first MATCH is OPTIONAL, we need a StartStep to provide an initial path
  // so that OptionalMatchStep has an input to extend with null bindings
  const firstMatchIsOptional = query.matches.length > 0 && query.matches[0]!.optional;
  if (firstMatchIsOptional) {
    steps.push(new StartStep({}));
  }

  let hasSeenPreviousMatch = false;
  for (const matchClause of query.matches) {
    // Convert the pattern to steps
    let patternSteps: Step<any>[];

    if (matchClause.pattern.type === "ShortestPathPattern") {
      patternSteps = convertShortestPathPattern(
        matchClause.pattern as ShortestPathPattern,
        matchClause.where,
      );
    } else if (matchClause.pattern.type === "MultiPattern") {
      // Handle comma-separated patterns like MATCH (a), (b)
      patternSteps = convertMultiPattern(matchClause.pattern as MultiPattern, matchClause.where);
    } else {
      // For OPTIONAL MATCH after a previous MATCH, the first node may reference
      // a previously bound variable. We enable anchor detection (anchoredToInput: true)
      // when there are previous steps in the query that may have bound variables.
      // The anchor heuristic will only trigger if the first node has no labels.
      const isAnchoredContext = matchClause.optional && hasSeenPreviousMatch;
      patternSteps = convertPattern(
        matchClause.pattern as Pattern,
        matchClause.where,
        isAnchoredContext,
      );
    }

    if (matchClause.optional) {
      // Wrap in OptionalMatchStep for OPTIONAL MATCH
      // skipAnchor: Only skip anchor if there was a previous MATCH that bound variables
      const skipAnchor = hasSeenPreviousMatch;
      const variables = extractPatternVariables(matchClause.pattern, skipAnchor);
      steps.push(new OptionalMatchStep({ variables }, patternSteps as Step<any>[]));
    } else {
      steps.push(...patternSteps);
    }
    hasSeenPreviousMatch = true;
  }

  // 1b. If no MATCH clauses but there are mutations or list operations, add a StartStep
  // to provide an initial empty path for CREATE/MERGE/UNWIND to work with
  const hasMutations =
    (query.merge && query.merge.length > 0) ||
    query.create ||
    query.set ||
    query.remove ||
    query.delete ||
    (query.foreach && query.foreach.length > 0);

  const hasListOperations =
    (query.unwind && query.unwind.length > 0) ||
    (query.with && query.with.length > 0) ||
    (query.call && query.call.length > 0);

  if (query.matches.length === 0 && (hasMutations || hasListOperations)) {
    steps.push(new StartStep({}));
  }

  // 1c. Handle WITH clauses (intermediate projections)
  if (query.with && query.with.length > 0) {
    for (const withClause of query.with) {
      const withStep = convertWithClause(withClause);
      steps.push(withStep);
    }
  }

  // 1d. Handle UNWIND clauses (list expansion)
  if (query.unwind && query.unwind.length > 0) {
    for (const unwindClause of query.unwind) {
      steps.push(MutUnwindStep.fromAST(unwindClause, MUTATION_CONVERSION_CONTEXT));
    }
  }

  // 1e. Handle CALL clauses (procedure invocation)
  if (query.call && query.call.length > 0) {
    for (const callClause of query.call) {
      const callStep = convertCallClause(callClause);
      steps.push(callStep);
    }
  }

  // 2. Handle FOREACH clauses
  if (query.foreach && query.foreach.length > 0) {
    for (const foreachClause of query.foreach) {
      const foreachStep = convertForeachClause(foreachClause);
      steps.push(foreachStep);
    }
  }

  // 3. Handle mutations (MERGE and CREATE) in their original order
  // Use the mutations array if available (preserves original order),
  // otherwise fall back to separate merge/create fields for backwards compatibility
  if (query.mutations && query.mutations.length > 0) {
    for (const mutation of query.mutations) {
      steps.push(
        dispatchMutationFromAST(mutation.type === "MergeClause" ? "Merge" : "Create", mutation)!,
      );
    }
  } else {
    // Backwards compatibility: process merge then create
    if (query.merge && query.merge.length > 0) {
      for (const mergeClause of query.merge) {
        steps.push(dispatchMutationFromAST("Merge", mergeClause)!);
      }
    }
    if (query.create) {
      steps.push(dispatchMutationFromAST("Create", query.create)!);
    }
  }

  // 5. Handle SET clause (mutations)
  if (query.set) {
    steps.push(dispatchMutationFromAST("Set", query.set)!);
  }

  // 6. Handle REMOVE clause
  if (query.remove) {
    steps.push(dispatchMutationFromAST("Remove", query.remove)!);
  }

  // 7. Handle DELETE clause
  if (query.delete) {
    steps.push(dispatchMutationFromAST("Delete", query.delete)!);
  }
}

/**
 * Convert a UNION query AST into a single QueryUnionStep that combines
 * multiple query branches.
 *
 * @param unionQuery The UnionQuery AST node containing multiple queries.
 * @returns A single-element array containing the QueryUnionStep.
 */
export function unionAstToSteps(unionQuery: UnionQuery): readonly Step<any>[] {
  // Convert each query in the union to its own step pipeline
  const branches = unionQuery.queries.map((query) => astToSteps(query));

  // Create a QueryUnionStep that combines all branches
  return [new QueryUnionStep({ all: unionQuery.all }, branches as Step<any>[][])];
}

/**
 * Convert any parsed AST (Query, UnionQuery, or MultiStatement) to steps.
 * This is the main entry point for handling all query types.
 */
export function anyAstToSteps(ast: Query | UnionQuery | MultiStatement): readonly Step<any>[] {
  if (ast.type === "MultiStatement") {
    return multiStatementToSteps(ast);
  }
  if (ast.type === "UnionQuery") {
    return unionAstToSteps(ast);
  }
  return astToSteps(ast);
}

/**
 * Convert a multi-statement query AST into a single MultiQueryStep that executes
 * each statement sequentially.
 *
 * @param multiStatement The MultiStatement AST node containing multiple statements.
 * @returns A single-element array containing the MultiQueryStep.
 */
export function multiStatementToSteps(multiStatement: MultiStatement): readonly Step<any>[] {
  // Convert each statement to its own step pipeline
  const statements = multiStatement.statements.map((stmt) => {
    if (stmt.type === "UnionQuery") {
      return unionAstToSteps(stmt);
    }
    return astToSteps(stmt);
  });

  // Create a MultiQueryStep that executes all statements
  return [new MultiQueryStep({}, statements as Step<any>[][])];
}


/**
 * Convert a WITH clause into a WithStep.
 */
function convertWithClause(withClause: WithClause): WithStep {
  const items: WithItemConfig[] = withClause.items.map((item) => convertWithItem(item));

  // Convert ORDER BY if present
  // Build alias map from WITH items for alias resolution
  const aliasMap = buildWithAliasMap(withClause.items);
  const orderBy = withClause.orderBy
    ? withClause.orderBy.orders.map(
        (order) => resolveOrderItem(order, aliasMap, true), // true = use alias directly for WITH ORDER BY
      )
    : undefined;

  // Convert WHERE condition if present
  const whereCondition = withClause.where
    ? convertCondition(withClause.where.condition)
    : undefined;

  return new WithStep({
    distinct: withClause.distinct,
    items,
    orderBy,
    skip: withClause.skip,
    limit: withClause.limit,
    whereCondition,
  });
}

/**
 * Convert a WITH item AST node to a WithItemConfig.
 */
function convertWithItem(item: WithItem): WithItemConfig {
  const expr = item.expression;

  // Handle null literal: WITH null AS x
  if (expr === null) {
    return {
      type: "expression",
      value: { type: "null" },
      alias: item.alias,
    };
  }

  if (expr.type === "VariableRef") {
    return {
      type: "variable",
      sourceVariable: expr.variable,
      alias: item.alias,
    };
  }

  if (expr.type === "PropertyAccess") {
    return {
      type: "property",
      sourceVariable: expr.variable,
      property: expr.property,
      alias: item.alias,
    };
  }

  if (expr.type === "WithAggregate") {
    return {
      type: "aggregate",
      function: expr.function,
      sourceVariable: expr.variable,
      property: expr.property,
      alias: item.alias,
    };
  }

  if (expr.type === "FunctionCall") {
    // Function calls like type(r), size(list), etc.
    return {
      type: "functionCall",
      functionName: expr.name,
      args: expr.args.map((arg) => convertConditionValue(arg)),
      distinct: expr.distinct,
      alias: item.alias,
    };
  }

  if (expr.type === "ListLiteral") {
    // List literals like [1, 2, 3]
    return {
      type: "expression",
      value: convertConditionValue(expr),
      alias: item.alias,
    };
  }

  if (expr.type === "ArithmeticExpression") {
    // Arithmetic expressions like a.num + a.num2
    return {
      type: "expression",
      value: convertConditionValue(expr),
      alias: item.alias,
    };
  }

  // Parameter references like $param
  return {
    type: "expression",
    value: convertConditionValue(expr),
    alias: item.alias,
  };
}
function convertCallClause(callClause: CallClause): CallStep {
  // Convert arguments (expressions) to condition values
  const args = callClause.arguments.map((arg) => convertConditionValue(arg));

  // Convert yield items
  const yieldItems: YieldItemConfig[] | undefined = callClause.yield?.map((item: YieldItem) => ({
    name: item.name,
    alias: item.alias,
  }));

  return new CallStep({
    procedureName: callClause.procedure,
    arguments: args,
    yieldItems,
  });
}


/**
 * Convert a FOREACH clause into a ForeachStep.
 */
function convertForeachClause(foreachClause: ForeachClause): ForeachStep<Step<any>[]> {
  const { variable, listExpression, operations } = foreachClause;

  // Convert the list expression
  const stepListExpression = convertListExpression(listExpression);

  // Convert the operations to inner steps
  const innerSteps: Step<any>[] = [];
  for (const operation of operations) {
    if (operation.type === "SetOperation") {
      const setOp = operation as ASTSetOperation;
      const setStep = convertSetOperationToStep(setOp);
      innerSteps.push(setStep);
    } else if (operation.type === "DeleteOperation") {
      // Convert DELETE/DETACH DELETE operations inside FOREACH
      const deleteOp = operation as ASTDeleteOperation;
      const deleteStep = new DeleteStep({
        variables: deleteOp.variables,
        detach: deleteOp.detach,
      });
      innerSteps.push(deleteStep);
    } else if (operation.type === "MatchClause") {
      // Convert MATCH operations inside FOREACH
      const matchClause = operation as MatchClause;
      const matchPattern = matchClause.pattern;

      if (matchPattern.type === "ShortestPathPattern") {
        // Convert shortestPath pattern to steps
        const shortestPathSteps = convertShortestPathPattern(
          matchPattern as ShortestPathPattern,
          matchClause.where,
        );
        innerSteps.push(...shortestPathSteps);
      } else {
        // Regular pattern - convert to steps
        const matchSteps = convertPattern(matchPattern as Pattern, matchClause.where);
        innerSteps.push(...matchSteps);
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
function convertListExpression(expr: ListExpression): ForeachListExpression {
  if (expr.type === "ListLiteral") {
    // ListLiteral from FOREACH grammar only contains literals
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

  throw new Error(`Unknown list expression type: ${(expr as any).type}`);
}

/**
 * Convert a SetOperation (from FOREACH) into a SetStep.
 * Note: FOREACH SET operations currently only support individual property assignments,
 * not bulk property operations (n = {props} or n += {props}).
 */
function convertSetOperationToStep(setOp: ASTSetOperation): SetStep {
  const assignments = setOp.assignments.map((assignment) => ({
    variable: assignment.variable,
    property: assignment.property,
    value: convertSetValue(assignment.value),
  }));

  return new SetStep({ assignments });
}

/**
 * Convert a ShortestPathPattern into a sequence of steps.
 * Uses ShortestPathStep with BFS/Dijkstra algorithm.
 *
 * TODO: The pattern.all field (for allShortestPaths) currently throws an error.
 * Only a single shortest path is supported. Implement support for finding
 * all shortest paths when pattern.all is true.
 *
 * @throws {Error} When pattern.all is true (allShortestPaths not implemented)
 */
function extractBoundVariables(query: Query): string[] {
  const variables: string[] = [];

  // Extract variables from MATCH clauses
  for (const match of query.matches) {
    const pattern = match.pattern;

    if (pattern.type === "ShortestPathPattern") {
      const sp = pattern as ShortestPathPattern;
      if (sp.variable) variables.push(sp.variable);
      if (sp.source.variable) variables.push(sp.source.variable);
      if (sp.target.variable) variables.push(sp.target.variable);
      if (sp.edge.variable) variables.push(sp.edge.variable);
    } else if (pattern.type === "MultiPattern") {
      // Handle comma-separated patterns
      const mp = pattern as MultiPattern;
      for (const p of mp.patterns) {
        for (const element of p.elements) {
          if (element.type === "NodePattern") {
            const node = element as NodePattern;
            if (node.variable) variables.push(node.variable);
          } else if (element.type === "EdgePattern") {
            const edge = element as EdgePattern;
            if (edge.variable) variables.push(edge.variable);
          }
        }
      }
    } else {
      const p = pattern as Pattern;
      for (const element of p.elements) {
        if (element.type === "NodePattern") {
          const node = element as NodePattern;
          if (node.variable) variables.push(node.variable);
        } else if (element.type === "EdgePattern") {
          const edge = element as EdgePattern;
          if (edge.variable) variables.push(edge.variable);
        }
      }
    }
  }

  // Extract aliases from WITH clauses
  if (query.with) {
    for (const withClause of query.with) {
      for (const item of withClause.items) {
        if (item.alias) {
          variables.push(item.alias);
        }
      }
    }
  }

  // Extract aliases from UNWIND clauses
  if (query.unwind) {
    for (const unwindClause of query.unwind) {
      if (unwindClause.alias) {
        variables.push(unwindClause.alias);
      }
    }
  }

  return variables;
}

/**
 * Helper to check if an expression is a function call to labels() or type()
 */
function isLegacyFunctionExpression(
  item: import("./AST.js").ReturnItem,
): { function: "labels" | "type"; variable: string } | null {
  if (item.function && item.variable) {
    return { function: item.function, variable: item.variable };
  }
  const expr = item.expression;
  if (expr && typeof expr === "object" && "type" in expr) {
    if (expr.type === "FunctionCall") {
      const funcCall = expr as FunctionCall;
      const name = funcCall.name.toLowerCase();
      if ((name === "labels" || name === "type") && funcCall.args.length === 1) {
        const arg = funcCall.args[0];
        if (arg && typeof arg === "object" && "type" in arg) {
          if (arg.type === "VariableRef") {
            return {
              function: name as "labels" | "type",
              variable: (arg as import("./AST.js").VariableRef).variable,
            };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Helper to check if an expression is a plain variable reference
 */
function isPlainVariableExpression(item: import("./AST.js").ReturnItem): string | null {
  if (item.variable && !item.property && !item.function && !item.aggregate) {
    return item.variable;
  }
  const expr = item.expression;
  if (expr && typeof expr === "object" && "type" in expr) {
    if (expr.type === "VariableRef") {
      return (expr as import("./AST.js").VariableRef).variable;
    }
  }
  return null;
}

/**
 * Helper to check if an expression is a property access
 */
function isPropertyAccessExpression(
  item: import("./AST.js").ReturnItem,
): { variable: string; property: string } | null {
  if (item.variable && item.property) {
    return { variable: item.variable, property: item.property };
  }
  const expr = item.expression;
  if (expr && typeof expr === "object" && "type" in expr) {
    if (expr.type === "PropertyAccess") {
      const prop = expr as import("./AST.js").PropertyAccess;
      return { variable: prop.variable, property: prop.property };
    }
  }
  return null;
}

/**
 * Convert RETURN clause to appropriate steps.
 * For mutation-only queries without RETURN, adds DrainStep to consume results.
 */
function convertReturnClause(query: Query): Step<any>[] {
  const steps: Step<any>[] = [];
  const returnClause = query.return;
  const groupByClause = query.groupBy;

  // If no RETURN clause (mutation-only query), add DrainStep
  // This ensures mutations execute (pipeline is consumed) but no results are returned
  if (!returnClause) {
    steps.push(new DrainStep({}));
    return steps;
  }

  // Check if we have any aggregate (using legacy format)
  const aggregateItems = returnClause.items.filter((item) => item.aggregate !== undefined);
  const aggregateItem = aggregateItems[0];

  // Check if we have any function calls (like labels(), type())
  // Using both legacy format and new expression format
  const functionItems = returnClause.items.filter(
    (item) => isLegacyFunctionExpression(item) !== null,
  );
  const functionItem = functionItems[0];
  const functionInfo = functionItem ? isLegacyFunctionExpression(functionItem) : null;

  // Check if we have any plain items (non-aggregate, non-function)
  // These could be plain variables, property access, or other expressions
  const plainItems = returnClause.items.filter(
    (item) => item.aggregate === undefined && isLegacyFunctionExpression(item) === null,
  );

  // If GROUP BY is present, use GroupByStep to handle mixed aggregates and functions
  if (groupByClause) {
    // Validate: non-aggregate RETURN items must appear in GROUP BY
    const nonAggregateItems = returnClause.items.filter((item) => item.aggregate === undefined);

    for (const returnItem of nonAggregateItems) {
      const matchesGroupBy = groupByClause.items.some((groupByItem) => {
        // Match by function (e.g., labels(n))
        if (returnItem.function && groupByItem.function) {
          return (
            returnItem.function === groupByItem.function &&
            returnItem.variable === groupByItem.variable
          );
        }
        // Match by property (e.g., n.name)
        if (returnItem.property && groupByItem.property) {
          return (
            returnItem.variable === groupByItem.variable &&
            returnItem.property === groupByItem.property
          );
        }
        // Match by variable (e.g., n)
        if (
          !returnItem.function &&
          !returnItem.property &&
          !groupByItem.function &&
          !groupByItem.property
        ) {
          return returnItem.variable === groupByItem.variable;
        }
        return false;
      });

      if (!matchesGroupBy) {
        const itemDesc = returnItem.function
          ? `${returnItem.function}(${returnItem.variable})`
          : returnItem.property
            ? `${returnItem.variable}.${returnItem.property}`
            : returnItem.variable;
        throw new Error(`Non-aggregate return item '${itemDesc}' must appear in GROUP BY clause`);
      }
    }

    steps.push(
      new GroupByStep({
        groupByItems: groupByClause.items.map((item) => ({
          variable: item.variable,
          property: item.property,
          function: item.function,
        })),
        returnItems: returnClause.items
          .filter((item) => item.variable !== undefined)
          .map((item) => ({
            variable: item.variable!,
            property: item.property,
            aggregate: item.aggregate,
            distinct: item.distinct,
            percentile: item.percentile,
            function: item.function,
            alias: item.alias,
          })),
      }),
    );

    // Add DedupStep if DISTINCT
    if (returnClause.distinct) {
      steps.push(new DedupStep({}));
    }

    return steps;
  }

  // Validate: cannot mix aggregates with non-aggregates (functions or plain items) without GROUP BY
  if (aggregateItem && (functionInfo || plainItems.length > 0)) {
    let mixedWith: string;
    if (functionInfo) {
      mixedWith = `function (${functionInfo.function})`;
    } else {
      const firstPlain = plainItems[0]!;
      const propInfo = isPropertyAccessExpression(firstPlain);
      const varInfo = isPlainVariableExpression(firstPlain);
      mixedWith = propInfo
        ? `non-aggregate expression (${propInfo.variable}.${propInfo.property})`
        : `non-aggregate expression (${varInfo ?? "expression"})`;
    }
    throw new Error(
      `Cannot use aggregate (${aggregateItem.aggregate}) with ${mixedWith} in RETURN clause without GROUP BY`,
    );
  }

  // Handle multiple aggregates without GROUP BY using GroupByStep with empty groupByItems
  if (aggregateItems.length > 1) {
    steps.push(
      new GroupByStep({
        groupByItems: [], // Empty means aggregate all rows into one group
        returnItems: returnClause.items
          .filter((item) => item.variable !== undefined)
          .map((item) => ({
            variable: item.variable!,
            property: item.property,
            aggregate: item.aggregate,
            distinct: item.distinct,
            percentile: item.percentile,
            function: item.function,
            alias: item.alias,
          })),
      }),
    );

    // Add DedupStep if DISTINCT
    if (returnClause.distinct) {
      steps.push(new DedupStep({}));
    }

    return steps;
  }

  // Handle single aggregate - use dedicated step for backward compatibility
  // But if DISTINCT is used, we need to use GroupByStep which supports DISTINCT
  if (aggregateItem && aggregateItem.aggregate) {
    if (aggregateItem.distinct) {
      // Use GroupByStep for DISTINCT aggregates
      steps.push(
        new GroupByStep({
          groupByItems: [], // Empty means aggregate all rows into one group
          returnItems: [
            {
              variable: aggregateItem.variable!,
              property: aggregateItem.property,
              aggregate: aggregateItem.aggregate,
              distinct: true,
              alias: aggregateItem.alias,
            },
          ],
        }),
      );

      // Add DedupStep if RETURN DISTINCT
      if (returnClause.distinct) {
        steps.push(new DedupStep({}));
      }

      return steps;
    }

    switch (aggregateItem.aggregate) {
      case "COUNT":
        steps.push(new CountStep({}));
        break;
      case "SUM":
        steps.push(new SumStep({ property: aggregateItem.property }));
        break;
      case "AVG":
        steps.push(new AvgStep({ property: aggregateItem.property }));
        break;
      case "MIN":
        steps.push(new MinStep({ property: aggregateItem.property }));
        break;
      case "MAX":
        steps.push(new MaxStep({ property: aggregateItem.property }));
        break;
      case "COLLECT":
        steps.push(new CollectStep({}));
        break;
      case "STDEV":
      case "STDEVP":
      case "PERCENTILEDISC":
      case "PERCENTILECONT":
        // Statistical aggregates use GroupByStep
        steps.push(
          new GroupByStep({
            groupByItems: [], // Empty means aggregate all rows into one group
            returnItems: [
              {
                variable: aggregateItem.variable!,
                property: aggregateItem.property,
                aggregate: aggregateItem.aggregate,
                percentile: aggregateItem.percentile,
                alias: aggregateItem.alias,
              },
            ],
          }),
        );
        break;
    }

    return steps;
  }

  // Use legacy labels/type path only for single-item returns
  // Multi-item returns with type() should use ExpressionReturnStep
  if (
    functionInfo &&
    (functionInfo.function === "labels" || functionInfo.function === "type") &&
    returnClause.items.length === 1
  ) {
    // Handle labels() and type() functions (single item only)
    // labels() returns an array of labels (for nodes, which can have multiple labels)
    // type() returns a single string (for relationships, which have one type)
    // Select the variable's path, then extract labels
    steps.push(
      new SelectStep({
        pathLabels: [functionInfo.variable],
      }),
    );
    // type() returns a string, labels() returns an array
    steps.push(new LabelsStep({ returnAsString: functionInfo.function === "type" }));

    // Add DedupStep if DISTINCT
    if (returnClause.distinct) {
      steps.push(new DedupStep({}));
    }
  } else {
    // Check if any items use the new expression-based format or legacy function format
    const hasExpressionItems = returnClause.items.some((item) => item.expression !== undefined);
    // Also check for legacy function items (labels/type) - these should also use ExpressionReturnStep
    const hasLegacyFunctionItems = returnClause.items.some(
      (item) => isLegacyFunctionExpression(item) !== null,
    );

    if (hasExpressionItems || hasLegacyFunctionItems) {
      // Use ExpressionReturnStep for expression-based and function return items
      const expressionItems: ExpressionReturnItem[] = returnClause.items.map((item) => {
        if (item.expression !== undefined) {
          return {
            expression: convertConditionValue(item.expression as import("./AST.js").ConditionValue),
            alias: item.alias,
          };
        }
        // Handle legacy function format (labels/type)
        const funcInfo = isLegacyFunctionExpression(item);
        if (funcInfo) {
          return {
            expression: {
              type: "functionCall" as const,
              name: funcInfo.function,
              args: [{ type: "variableRef" as const, variable: funcInfo.variable }],
              distinct: false,
            },
            alias: item.alias ?? `${funcInfo.function}(${funcInfo.variable})`,
          };
        }
        // Fallback for property access
        if (item.property) {
          return {
            expression: {
              type: "propertyRef" as const,
              variable: item.variable!,
              property: item.property,
            },
            alias: item.alias,
          };
        }
        return {
          expression: {
            type: "variableRef" as const,
            variable: item.variable!,
          },
          alias: item.alias,
        };
      });

      steps.push(new ExpressionReturnStep({ items: expressionItems }));

      // Add DedupStep if DISTINCT
      if (returnClause.distinct) {
        steps.push(new DedupStep({}));
      }
    } else {
      // Determine which variables to return (legacy path)
      let pathLabels: string[];

      if (returnClause.returnAll) {
        // RETURN * - collect all bound variables from MATCH clauses
        pathLabels = extractBoundVariables(query);
      } else {
        // Explicit return items
        pathLabels = returnClause.items.map((item) => item.variable!);
      }

      // Check if any items have property access (e.g., RETURN d.schema)
      const hasPropertyAccess = returnClause.items.some(
        (item) => item.property !== undefined && !item.aggregate && !item.function,
      );

      // Regular return - add SelectStep to select path labels
      steps.push(
        new SelectStep({
          pathLabels,
        }),
      );

      if (hasPropertyAccess) {
        // Use PropertyValuesStep to extract specific properties
        const items = returnClause.items.map((item) => ({
          variable: item.variable!,
          property: item.property,
        }));
        steps.push(new PropertyValuesStep({ items }));
      } else {
        // Use ValuesStep to extract full values
        steps.push(new ValuesStep({}));
      }

      // Add DedupStep if DISTINCT
      if (returnClause.distinct) {
        steps.push(new DedupStep({}));
      }
    }
  }

  return steps;
}

/**
 * Extract variable names bound by a pattern for OPTIONAL MATCH null bindings.
 * When skipAnchor is true, skips the first node if it's an anchor pattern
 * (variable reference with no labels and has edges following).
 */
function extractPatternVariables(
  pattern: Pattern | MultiPattern | ShortestPathPattern,
  skipAnchor: boolean = false,
): string[] {
  const variables: string[] = [];

  if (pattern.type === "ShortestPathPattern") {
    const sp = pattern as ShortestPathPattern;
    if (sp.variable) variables.push(sp.variable);
    if (sp.source.variable) variables.push(sp.source.variable);
    if (sp.target.variable) variables.push(sp.target.variable);
    if (sp.edge.variable) variables.push(sp.edge.variable);
  } else if (pattern.type === "MultiPattern") {
    const mp = pattern as MultiPattern;
    for (const subPattern of mp.patterns) {
      variables.push(...extractPatternVariables(subPattern, skipAnchor));
    }
  } else {
    // Regular Pattern
    const p = pattern as Pattern;
    let isFirst = true;
    for (const element of p.elements) {
      if (element.type === "NodePattern") {
        const node = element as NodePattern;
        // Skip the anchor variable if requested and it looks like an anchor
        // (first node with variable but no labels/expression, with more elements following)
        const isAnchor =
          isFirst &&
          skipAnchor &&
          node.variable &&
          node.labels.length === 0 &&
          !node.labelExpression &&
          !node.properties &&
          p.elements.length > 1;
        if (node.variable && !isAnchor) {
          variables.push(node.variable);
        }
        isFirst = false;
      } else if (element.type === "EdgePattern") {
        const edge = element as EdgePattern;
        if (edge.variable) variables.push(edge.variable);
        isFirst = false;
      } else if (element.type === "ParenthesizedPathPattern") {
        // Recursively extract variables from the inner pattern
        const parenthesized = element as ParenthesizedPathPattern;
        variables.push(...extractPatternVariables(parenthesized.pattern, false));
        isFirst = false;
      }
    }
  }

  return variables;
}

/**
 * Alias information from RETURN clause items.
 * Maps alias names to their underlying property access paths.
 */
interface AliasInfo {
  variable: string;
  property?: string;
}

/**
 * Build a map of aliases from RETURN clause items.
 * Maps alias name → underlying variable/property info.
 */
function buildReturnAliasMap(returnClause: ReturnClause | undefined): Map<string, AliasInfo> {
  const aliasMap = new Map<string, AliasInfo>();
  if (!returnClause) return aliasMap;

  for (const item of returnClause.items) {
    if (item.alias) {
      // Alias explicitly specified
      aliasMap.set(item.alias, {
        variable: item.variable ?? "",
        property: item.property,
      });
    } else if (item.variable && !item.property) {
      // Plain variable reference like RETURN n (alias is implicitly 'n')
      aliasMap.set(item.variable, {
        variable: item.variable,
      });
    } else if (item.variable && item.property) {
      // Property access like RETURN n.name (no explicit alias)
      // In Cypher, you can reference this by the property name alone
      aliasMap.set(item.property, {
        variable: item.variable,
        property: item.property,
      });
    }
  }

  return aliasMap;
}

/**
 * Build a map of aliases from WITH clause items.
 * Maps alias name → underlying variable/property info.
 */
function buildWithAliasMap(items: WithItem[]): Map<string, AliasInfo> {
  const aliasMap = new Map<string, AliasInfo>();

  for (const item of items) {
    const expr = item.expression;
    // Handle null literal: WITH null AS x
    if (expr === null) {
      aliasMap.set(item.alias, {
        variable: item.alias,
      });
    } else if (expr.type === "VariableRef") {
      // Variable reference like `WITH n` or `WITH n AS alias`
      aliasMap.set(item.alias, {
        variable: expr.variable,
      });
    } else if (expr.type === "PropertyAccess") {
      // Property access like `WITH n.name AS name`
      aliasMap.set(item.alias, {
        variable: expr.variable,
        property: expr.property,
      });
    } else {
      // Complex expression (WithAggregate, FunctionCall) - just track the alias itself
      aliasMap.set(item.alias, {
        variable: item.alias,
      });
    }
  }

  return aliasMap;
}

/**
 * Resolve an ORDER BY item to a direction config for OrderStep.
 * Handles both property access (n.name) and alias references (value).
 *
 * @param useAliasDirectly - If true (WITH ORDER BY), use the alias as the key since
 *   the path has the alias bound after projection. If false (RETURN ORDER BY), use
 *   the source property/variable since ordering happens before projection.
 */
function resolveOrderItem(
  order: OrderItem,
  aliasMap: Map<string, AliasInfo>,
  useAliasDirectly: boolean = false,
): {
  key?: string;
  expression?: ConditionValue;
  direction: OrderDirection;
  nulls?: "first" | "last";
} {
  const base =
    order.expression !== undefined
      ? {
          expression: useAliasDirectly
            ? convertConditionValue(order.expression)
            : resolveReturnOrderExpression(order.expression, aliasMap),
        }
      : {
          key: resolveOrderKey(order, aliasMap, useAliasDirectly),
        };

  return {
    ...base,
    direction: order.direction.toLowerCase() as OrderDirection,
    ...(order.nulls && {
      nulls: order.nulls.toLowerCase() as "first" | "last",
    }),
  };
}

function resolveOrderKey(
  order: OrderItem,
  aliasMap: Map<string, AliasInfo>,
  useAliasDirectly: boolean,
): string | undefined {
  if (order.alias) {
    if (useAliasDirectly) {
      // WITH ORDER BY: use alias directly since path has it bound after projection
      return order.alias;
    }

    // RETURN ORDER BY: look up source property/variable
    const aliasInfo = aliasMap.get(order.alias);
    if (aliasInfo?.property) {
      return aliasInfo.property;
    }
    if (aliasInfo) {
      return aliasInfo.variable;
    }
    return order.alias;
  }

  // ORDER BY variable.property - use property as key
  return order.property;
}

function resolveReturnOrderExpression(
  expression: Exclude<OrderItem["expression"], undefined>,
  aliasMap: Map<string, AliasInfo>,
): ConditionValue {
  return rewriteOrderAliases(convertConditionValue(expression), aliasMap);
}

function rewriteOrderAliases(
  value: ConditionValue,
  aliasMap: Map<string, AliasInfo>,
): ConditionValue {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  switch (value.type) {
    case "variableRef": {
      const aliasInfo = aliasMap.get(value.variable);
      if (!aliasInfo) {
        return value;
      }
      if (aliasInfo.property) {
        return {
          type: "propertyRef",
          variable: aliasInfo.variable,
          property: aliasInfo.property,
        };
      }
      return {
        type: "variableRef",
        variable: aliasInfo.variable,
      };
    }
    case "pathRef": {
      const aliasInfo = aliasMap.get(value.variable);
      if (!aliasInfo || aliasInfo.property) {
        return value;
      }
      return {
        type: "pathRef",
        variable: aliasInfo.variable,
      };
    }
    case "propertyRef":
      return value;
    case "parameterRef":
    case "null":
      return value;
    case "arithmeticExpression":
      return {
        ...value,
        left: rewriteOrderAliases(value.left, aliasMap),
        right: rewriteOrderAliases(value.right, aliasMap),
      };
    case "unaryExpression":
      return {
        ...value,
        operand: rewriteOrderAliases(value.operand, aliasMap),
      };
    case "booleanExpression":
      if (value.operator === "NOT") {
        return {
          ...value,
          operand: rewriteOrderAliases(value.operand, aliasMap),
        };
      }
      return {
        ...value,
        left: rewriteOrderAliases(value.left, aliasMap),
        right: rewriteOrderAliases(value.right, aliasMap),
      };
    case "comparisonExpression":
      if (value.operator === "IS NULL" || value.operator === "IS NOT NULL") {
        return {
          type: "comparisonExpression",
          operator: value.operator,
          left: rewriteOrderAliases(value.left, aliasMap),
        };
      }
      if (!("right" in value)) {
        return value;
      }
      return {
        type: "comparisonExpression",
        operator: value.operator,
        left: rewriteOrderAliases(value.left, aliasMap),
        right: rewriteOrderAliases(value.right, aliasMap),
      };
    case "functionCall":
      return {
        ...value,
        args: value.args.map((arg) => rewriteOrderAliases(arg, aliasMap)),
      };
    case "simpleCaseExpression":
      return {
        ...value,
        test: rewriteOrderAliases(value.test, aliasMap),
        alternatives: value.alternatives.map((alternative) => ({
          when: rewriteOrderAliases(alternative.when, aliasMap),
          // oxlint-disable-next-line unicorn/no-thenable -- 'then' is AST field name, not a Promise
          then: rewriteOrderAliases(alternative.then, aliasMap),
        })),
        ...(value.else !== undefined && {
          else: rewriteOrderAliases(value.else, aliasMap),
        }),
      };
    case "searchedCaseExpression":
      return {
        ...value,
        alternatives: value.alternatives.map((alternative) => ({
          when: alternative.when,
          // oxlint-disable-next-line unicorn/no-thenable -- 'then' is AST field name, not a Promise
          then: rewriteOrderAliases(alternative.then, aliasMap),
        })),
        ...(value.else !== undefined && {
          else: rewriteOrderAliases(value.else, aliasMap),
        }),
      };
    case "listLiteral":
      return {
        ...value,
        values: value.values.map((entry) => rewriteOrderAliases(entry, aliasMap)),
      };
    case "mapLiteral":
      return {
        ...value,
        entries: value.entries.map((entry) => ({
          key: entry.key,
          value: rewriteOrderAliases(entry.value, aliasMap),
        })),
      };
    case "listIndexExpression":
      return {
        ...value,
        list: rewriteOrderAliases(value.list, aliasMap),
        index: rewriteOrderAliases(value.index, aliasMap),
      };
    case "sliceExpression":
      return {
        ...value,
        list: rewriteOrderAliases(value.list, aliasMap),
        ...(value.start !== undefined && {
          start: rewriteOrderAliases(value.start, aliasMap),
        }),
        ...(value.end !== undefined && {
          end: rewriteOrderAliases(value.end, aliasMap),
        }),
      };
    case "listComprehension":
      return {
        ...value,
        list: rewriteOrderAliases(value.list, aliasMap),
        ...(value.projection !== undefined && {
          projection: rewriteOrderAliases(value.projection, aliasMap),
        }),
      };
    case "quantifierExpression":
      return {
        ...value,
        list: rewriteOrderAliases(value.list, aliasMap),
      };
    case "reduceExpression":
      return {
        ...value,
        init: rewriteOrderAliases(value.init, aliasMap),
        list: rewriteOrderAliases(value.list, aliasMap),
        expression: rewriteOrderAliases(value.expression, aliasMap),
      };
    case "dynamicPropertyAccess":
      return {
        ...value,
        object: rewriteOrderAliases(value.object, aliasMap),
        property: rewriteOrderAliases(value.property, aliasMap),
      };
    case "patternComprehension":
      return {
        ...value,
        projection: rewriteOrderAliases(value.projection, aliasMap),
      };
    case "mapProjection":
      return {
        ...value,
        selectors: value.selectors.map((selector) => {
          if (selector.type !== "literalEntry") {
            return selector;
          }
          return {
            ...selector,
            value: rewriteOrderAliases(selector.value, aliasMap),
          };
        }),
      };
    case "existsSubquery":
      return value;
    case "memberAccess":
      return {
        ...value,
        object: rewriteOrderAliases(value.object, aliasMap),
      };
  }
}
