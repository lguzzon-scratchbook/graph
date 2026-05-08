/**
 * StepRegistry - Central registry for graph traversal steps.
 *
 * This module provides a type-safe framework for registering and creating
 * step instances. Steps are categorized and can be dynamically registered
 * or looked up by name.
 *
 * Pattern: Replicates FunctionRegistry.ts for step management.
 */

import type { Step, StepConfig } from "./base.js";
import type { QueryContext } from "../QueryContext.js";
import type { AST } from "../AST.js";

/**
 * Step category for organization and filtering.
 */
export type StepCategory =
  | "fetch"
  | "traversal"
  | "filter"
  | "transform"
  | "aggregate"
  | "mutation"
  | "control"
  | "setops"
  | "other";

/**
 * Constructor interface for step classes.
 * All step classes must implement this interface to be registered.
 * Uses permissive typing to support modular steps with varying config shapes.
 */
export interface StepConstructor {
  /** The step name (used for registry lookup) */
  readonly stepName: string;

  /** The step category */
  readonly category: StepCategory;

  /** Create a new step instance from config - accepts any config type */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): Step<StepConfig>;

  /** Deserialize from JSON */
  fromJSON(json: unknown): Step<StepConfig> | null;

  /** Create from AST node (optional - for steps that can be created from AST) */
  fromAST?(astNode: AST, context: ASTConversionContext): Step<StepConfig> | null;
}

/**
 * Context for AST-to-step conversion.
 */
export interface ASTConversionContext {
  /** Query context for parameter resolution */
  queryContext: QueryContext;

  /** Available variable bindings */
  boundVariables: Set<string>;

  /** Graph schema for validation */
  schema?: unknown;
}

/**
 * Step definition in the registry.
 */
export interface StepDefinition {
  /** Step name (case-sensitive, unique) */
  name: string;

  /** Step category */
  category: StepCategory;

  /** The step constructor */
  constructor: StepConstructor;
}

/**
 * Registry of all available steps.
 *
 * Follows the same pattern as FunctionRegistry:
 * - register() adds new step types
 * - get() looks up by name
 * - has() checks existence
 * - create() instantiates a step
 */
export class StepRegistry {
  #steps: Map<string, StepDefinition> = new Map();

  /**
   * Register a step definition.
   */
  public register(def: StepDefinition): void {
    if (this.#steps.has(def.name)) {
      throw new Error(`Step "${def.name}" is already registered`);
    }
    this.#steps.set(def.name, def);
  }

  /**
   * Look up a step by name.
   */
  public get(name: string): StepDefinition | undefined {
    return this.#steps.get(name);
  }

  /**
   * Check if a step is registered.
   */
  public has(name: string): boolean {
    return this.#steps.has(name);
  }

  /**
   * Create a step instance from a name and config.
   */
  public create(name: string, config: Record<string, unknown>): Step<StepConfig> {
    const def = this.get(name);
    if (!def) {
      throw new Error(`Unknown step: ${name}`);
    }
    return new def.constructor(config);
  }

  /**
   * Deserialize a step from its JSON representation.
   * Expects format: [name, config, steps?]
   */
  public fromJSON(json: unknown): Step<StepConfig> | null {
    if (!Array.isArray(json) || json.length < 2) {
      return null;
    }

    const [name] = json;
    if (typeof name !== "string") {
      return null;
    }

    const def = this.get(name);
    if (!def) {
      return null;
    }

    return def.constructor.fromJSON(json);
  }

  /**
   * Get all registered step names.
   */
  public stepNames(): string[] {
    return Array.from(this.#steps.keys()).sort();
  }

  /**
   * Get all steps in a category.
   */
  public stepsInCategory(category: StepCategory): StepDefinition[] {
    return Array.from(this.#steps.values()).filter((def) => def.category === category);
  }

  /**
   * Get all registered categories.
   */
  public categories(): StepCategory[] {
    const cats = new Set<StepCategory>();
    for (const def of this.#steps.values()) {
      cats.add(def.category);
    }
    return Array.from(cats).sort();
  }

  /**
   * Get the count of registered steps.
   */
  public get size(): number {
    return this.#steps.size;
  }
}

/**
 * Global step registry instance.
 */
export const stepRegistry = new StepRegistry();

/**
 * Check if a step name is a known registered step.
 */
export function isKnownStep(name: string): boolean {
  return stepRegistry.has(name);
}

/**
 * Create a step from its JSON representation.
 * Convenience function that uses the global registry.
 */
export function createStepFromJSON(json: unknown): Step<StepConfig> | null {
  return stepRegistry.fromJSON(json);
}
