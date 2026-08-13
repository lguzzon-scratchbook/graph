/**
 * CreateStep - Modular mutation step for creating elements.
 *
 * Re-exports from Steps.ts (source of truth) and adds registry metadata
 * for dynamic step registration and AST conversion.
 */

import {
  CreateStep as BaseCreateStep,
  type CreateStepConfig,
  type CreateVertexConfig,
  type CreateEdgeConfig,
} from "../../Steps.js";
import { stepRegistry, type ASTConversionContext } from "../StepRegistry.js";
import type {
  CreateClause,
  CreateNodePattern,
  CreateChainPattern,
  CreateVariableRef,
  CreateEdgePattern,
} from "../../AST.js";
import { convertPropertyMap } from "../shared/astToStepsHelpers.js";

/**
 * CreateStep implementation - source of truth remains in Steps.ts.
 * This module adds registry integration for dynamic step creation.
 */
export class CreateStep extends BaseCreateStep {
  static readonly stepName = "Create";

  static readonly category = "mutation" as const;

  /**
   * Convert a CreateClause AST node into a CreateStep.
   * Handles both simple node patterns and chain patterns (with relationships).
   * @param ast The CreateClause AST node.
   */
  static fromAST(ast: CreateClause, _context: ASTConversionContext): CreateStep {
    const vertices: CreateVertexConfig[] = [];
    const edges: CreateEdgeConfig[] = [];
    // Track variables assigned to nodes (including generated ones for anonymous nodes)
    // Maps from the node object reference to the assigned variable name
    const nodeVariables = new Map<CreateNodePattern | CreateVariableRef, string>();
    // Counter for generating unique anonymous variable names
    let anonCounter = 0;
    for (const pattern of ast.patterns) {
      if (pattern.type === "CreateNodePattern") {
        // Simple standalone node creation
        const nodePattern = pattern as CreateNodePattern;
        vertices.push({
          variable: nodePattern.variable,
          label: nodePattern.labels[0] || "Node",
          properties: convertPropertyMap(nodePattern.properties),
        });
      } else if (pattern.type === "CreateChainPattern") {
        // Chain pattern: process nodes and edges in sequence
        const chain = pattern as CreateChainPattern;
        const elements = chain.elements;
        // First pass: assign variables to all nodes and collect nodes to create
        for (let i = 0; i < elements.length; i += 2) {
          const nodeElement = elements[i] as CreateNodePattern | CreateVariableRef;
          if (nodeElement.type === "CreateVariableRef") {
            nodeVariables.set(nodeElement, nodeElement.variable);
          } else {
            const nodePattern = nodeElement as CreateNodePattern;
            const variable = nodePattern.variable || `__anon_${anonCounter++}`;
            nodeVariables.set(nodeElement, variable);
            vertices.push({
              variable,
              label: nodePattern.labels[0] || "",
              properties: convertPropertyMap(nodePattern.properties),
            });
          }
        }
        // Second pass: collect all edges using assigned variables
        for (let i = 1; i < elements.length; i += 2) {
          const edgeElement = elements[i] as CreateEdgePattern;
          const prevNode = elements[i - 1] as CreateNodePattern | CreateVariableRef;
          const nextNode = elements[i + 1] as CreateNodePattern | CreateVariableRef;
          const startVariable = nodeVariables.get(prevNode);
          const endVariable = nodeVariables.get(nextNode);
          if (!startVariable || !endVariable) {
            throw new Error("CREATE: Internal error - node variable not assigned");
          }
          edges.push({
            variable: edgeElement.variable,
            label: edgeElement.label,
            direction: edgeElement.direction,
            properties: convertPropertyMap(edgeElement.properties),
            startVariable,
            endVariable,
          });
        }
      }
    }
    return new CreateStep({
      vertices,
      edges: edges.length > 0 ? edges : undefined,
    });
  }

  /**
   * Deserialize from JSON format.
   * Format: ["Create", { vertices: [...], edges?: [...] }]
   */
  static fromJSON(json: unknown): CreateStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Create") return null;

    const cfg = config as CreateStepConfig | undefined;
    if (!cfg?.vertices) return null;

    return new CreateStep({
      vertices: cfg.vertices,
      edges: cfg.edges,
      stepLabels: cfg.stepLabels,
    });
  }

  override clone(partial?: Partial<CreateStepConfig>): CreateStep {
    const { config } = this;
    return new CreateStep({
      vertices: partial?.vertices ?? config.vertices,
      edges: partial?.edges ?? config.edges,
      stepLabels: partial?.stepLabels ?? (config.stepLabels ? [...config.stepLabels] : undefined),
    });
  }
}

// Register with step registry
stepRegistry.register({
  name: CreateStep.stepName,
  category: CreateStep.category,
  constructor: CreateStep,
});
