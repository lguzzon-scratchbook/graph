/**
 * TCK-specific test utilities (barrel).
 *
 * Thin re-exports over the three TCK helper modules — the schema factory,
 * the query runner, and the result oracle — so that the 250+ TCK scenario
 * files keep importing from this single module unchanged.
 */
export {
  makeType,
  tckSchema,
  createTckGraph,
} from "./helpers/schema.js";
export type { TckSchema } from "./helpers/schema.js";
export { executeTckQuery } from "./helpers/runner.js";
export {
  Element,
  resultsMatch,
  normalizeResult,
  extractProperties,
  getLabel,
  getType,
  getProperty,
  getId,
} from "./helpers/oracle.js";