/**
 * TCK query runner.
 * Executes a query string against a TCK graph and materializes the results.
 */
import type { Graph } from "../../../Graph.js";
import type { Query, UnionQuery } from "../../../AST.js";
import { parse } from "../../../grammar.js";
import { anyAstToSteps } from "../../../astToSteps.js";
import { createTraverser } from "../../../Steps.js";
import { QueryContext, type QueryParams } from "../../../QueryContext.js";
import type { TckSchema } from "./schema.js";

/**
 * Parses and executes a query string against a TCK graph.
 * Returns the results as an array.
 * Supports both regular Query and UnionQuery.
 * @param graph The graph to query.
 * @param queryString The Cypher query string.
 * @param params Optional query parameters ($param references).
 */
export function executeTckQuery(
  graph: Graph<TckSchema>,
  queryString: string,
  params?: QueryParams,
): unknown[] {
  const ast = parse(queryString) as Query | UnionQuery;
  // Use anyAstToSteps which handles both Query and UnionQuery
  const steps = anyAstToSteps(ast);
  const traverser = createTraverser(steps);
  // Create a QueryContext with parameters if provided
  const context = new QueryContext(graph, params ?? {});
  return Array.from(traverser.traverse(graph, [], context));
}