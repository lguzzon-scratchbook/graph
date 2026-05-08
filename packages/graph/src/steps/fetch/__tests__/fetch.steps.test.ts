import { describe, it, expect } from "vitest";
import { FetchVerticesStep, FetchEdgesStep, CartesianFetchStep } from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";
import type { QueryContext } from "../../../QueryContext.js";

const _mockContext = { params: {} } as QueryContext;

describe("FetchVerticesStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("FetchVertices")).toBe(true);
    expect(stepRegistry.get("FetchVertices")?.category).toBe("fetch");
  });

  it("should have correct static properties", () => {
    expect(FetchVerticesStep.stepName).toBe("FetchVertices");
    expect(FetchVerticesStep.category).toBe("fetch");
  });

  it("should create instance with config", () => {
    const step = new FetchVerticesStep({ vertexLabels: ["Person"] });
    expect(step).toBeInstanceOf(FetchVerticesStep);
    expect(step.name).toBe("FetchVertices");
    expect(step.config.vertexLabels).toEqual(["Person"]);
  });

  it("should deserialize from JSON", () => {
    const step = FetchVerticesStep.fromJSON(["FetchVertices", { vertexLabels: ["Person"] }]);
    expect(step).toBeInstanceOf(FetchVerticesStep);
    expect(step?.config.vertexLabels).toEqual(["Person"]);
  });

  it("should return null for invalid JSON", () => {
    expect(FetchVerticesStep.fromJSON(null)).toBeNull();
    expect(FetchVerticesStep.fromJSON([])).toBeNull();
    expect(FetchVerticesStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should return null for missing config", () => {
    expect(FetchVerticesStep.fromJSON(["FetchVertices"])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new FetchVerticesStep({ vertexLabels: ["Person"], stepLabels: ["a"] });
    const cloned = step.clone({ vertexLabels: ["Thing"] });
    expect(cloned).toBeInstanceOf(FetchVerticesStep);
    expect(cloned.config.vertexLabels).toEqual(["Thing"]);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });

  it("should preserve stepLabels when cloning without override", () => {
    const step = new FetchVerticesStep({ vertexLabels: ["Person"], stepLabels: ["n"] });
    const cloned = step.clone({});
    expect(cloned.config.stepLabels).toEqual(["n"]);
  });
});

describe("FetchEdgesStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("FetchEdges")).toBe(true);
    expect(stepRegistry.get("FetchEdges")?.category).toBe("fetch");
  });

  it("should have correct static properties", () => {
    expect(FetchEdgesStep.stepName).toBe("FetchEdges");
    expect(FetchEdgesStep.category).toBe("fetch");
  });

  it("should create instance with config", () => {
    const step = new FetchEdgesStep({ edgeLabels: ["knows"] });
    expect(step).toBeInstanceOf(FetchEdgesStep);
    expect(step.name).toBe("FetchEdges");
  });

  it("should deserialize from JSON", () => {
    const step = FetchEdgesStep.fromJSON(["FetchEdges", { edgeLabels: ["knows"] }]);
    expect(step).toBeInstanceOf(FetchEdgesStep);
    expect(step?.config.edgeLabels).toEqual(["knows"]);
  });

  it("should return null for invalid JSON", () => {
    expect(FetchEdgesStep.fromJSON(null)).toBeNull();
    expect(FetchEdgesStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new FetchEdgesStep({ edgeLabels: ["knows"], stepLabels: ["e"] });
    const cloned = step.clone({ edgeLabels: ["likes"] });
    expect(cloned).toBeInstanceOf(FetchEdgesStep);
    expect(cloned.config.edgeLabels).toEqual(["likes"]);
    expect(cloned.config.stepLabels).toEqual(["e"]);
  });
});

describe("CartesianFetchStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("CartesianFetch")).toBe(true);
    expect(stepRegistry.get("CartesianFetch")?.category).toBe("fetch");
  });

  it("should have correct static properties", () => {
    expect(CartesianFetchStep.stepName).toBe("CartesianFetch");
    expect(CartesianFetchStep.category).toBe("fetch");
  });

  it("should create instance with config", () => {
    const step = new CartesianFetchStep({ vertexLabels: ["Person"] });
    expect(step).toBeInstanceOf(CartesianFetchStep);
    expect(step.name).toBe("CartesianFetch");
  });

  it("should deserialize from JSON", () => {
    const step = CartesianFetchStep.fromJSON(["CartesianFetch", { vertexLabels: ["Person"] }]);
    expect(step).toBeInstanceOf(CartesianFetchStep);
    expect(step?.config.vertexLabels).toEqual(["Person"]);
  });

  it("should return null for invalid JSON", () => {
    expect(CartesianFetchStep.fromJSON(null)).toBeNull();
    expect(CartesianFetchStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone with partial config preserving condition", () => {
    const condition = ["=", "name", "Alice"] as import("../../../Steps.js").Condition;
    const step = new CartesianFetchStep({
      vertexLabels: ["Person"],
      condition,
      stepLabels: ["n"],
    });
    const cloned = step.clone({ vertexLabels: ["Thing"] });
    expect(cloned).toBeInstanceOf(CartesianFetchStep);
    expect(cloned.config.vertexLabels).toEqual(["Thing"]);
    expect(cloned.config.condition).toEqual(condition);
    expect(cloned.config.stepLabels).toEqual(["n"]);
  });
});

describe("Fetch steps registry integration", () => {
  it("should create FetchVertices via registry", () => {
    const def = stepRegistry.get("FetchVertices");
    expect(def).toBeDefined();
    const step = stepRegistry.create("FetchVertices", { vertexLabels: ["Person"] });
    expect(step).toBeInstanceOf(FetchVerticesStep);
  });

  it("should create FetchEdges via registry", () => {
    const step = stepRegistry.create("FetchEdges", { edgeLabels: ["knows"] });
    expect(step).toBeInstanceOf(FetchEdgesStep);
  });

  it("should create CartesianFetch via registry", () => {
    const step = stepRegistry.create("CartesianFetch", { vertexLabels: ["Person"] });
    expect(step).toBeInstanceOf(CartesianFetchStep);
  });

  it("should list all fetch steps by category", () => {
    const fetchSteps = ["FetchVertices", "FetchEdges", "CartesianFetch"];
    for (const name of fetchSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("fetch");
    }
  });

  it("should throw for unknown step via registry", () => {
    expect(() => stepRegistry.create("UnknownStep", {})).toThrow();
  });
});

describe("Fetch steps JSON serialization", () => {
  it("should serialize FetchVertices to JSON", () => {
    const step = new FetchVerticesStep({ vertexLabels: ["Person"], stepLabels: ["n"] });
    const json = step.toJSON();
    expect(json[0]).toBe("FetchVertices");
    expect((json[1] as Record<string, unknown>).vertexLabels).toEqual(["Person"]);
  });

  it("should round-trip FetchVertices through JSON", () => {
    const original = new FetchVerticesStep({ vertexLabels: ["Person", "Thing"] });
    const json = original.toJSON();
    const restored = FetchVerticesStep.fromJSON(json);
    expect(restored).toBeInstanceOf(FetchVerticesStep);
    expect(restored?.config.vertexLabels).toEqual(["Person", "Thing"]);
  });

  it("should round-trip FetchEdges through JSON", () => {
    const original = new FetchEdgesStep({ edgeLabels: ["knows"] });
    const json = original.toJSON();
    const restored = FetchEdgesStep.fromJSON(json);
    expect(restored).toBeInstanceOf(FetchEdgesStep);
    expect(restored?.config.edgeLabels).toEqual(["knows"]);
  });

  it("should round-trip CartesianFetch through JSON", () => {
    const original = new CartesianFetchStep({ vertexLabels: ["Person"] });
    const json = original.toJSON();
    const restored = CartesianFetchStep.fromJSON(json);
    expect(restored).toBeInstanceOf(CartesianFetchStep);
  });
});
