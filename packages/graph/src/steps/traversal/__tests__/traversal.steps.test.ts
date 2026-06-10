import { describe, it, expect } from "vitest";
import { VertexStep, EdgeStep, RepeatStep, ShortestPathStep } from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";
import type { Step } from "../../../Steps.js";

describe("VertexStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Vertex")).toBe(true);
    expect(stepRegistry.get("Vertex")?.category).toBe("traversal");
  });

  it("should have correct static properties", () => {
    expect(VertexStep.stepName).toBe("Vertex");
    expect(VertexStep.category).toBe("traversal");
  });

  it("should create instance with config", () => {
    const step = new VertexStep({ direction: "out", edgeLabels: ["knows"] });
    expect(step).toBeInstanceOf(VertexStep);
    expect(step.name).toBe("Vertex");
    expect(step.config.direction).toBe("out");
    expect(step.config.edgeLabels).toEqual(["knows"]);
  });

  it("should deserialize from JSON", () => {
    const step = VertexStep.fromJSON(["Vertex", { direction: "out", edgeLabels: ["knows"] }]);
    expect(step).toBeInstanceOf(VertexStep);
    expect(step?.config.direction).toBe("out");
    expect(step?.config.edgeLabels).toEqual(["knows"]);
  });

  it("should return null for invalid JSON", () => {
    expect(VertexStep.fromJSON(null)).toBeNull();
    expect(VertexStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new VertexStep({ direction: "out", edgeLabels: ["knows"], stepLabels: ["a"] });
    const cloned = step.clone({ direction: "in" });
    expect(cloned).toBeInstanceOf(VertexStep);
    expect(cloned.config.direction).toBe("in");
    expect(cloned.config.edgeLabels).toEqual(["knows"]);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("EdgeStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Edge")).toBe(true);
    expect(stepRegistry.get("Edge")?.category).toBe("traversal");
  });

  it("should have correct static properties", () => {
    expect(EdgeStep.stepName).toBe("Edge");
    expect(EdgeStep.category).toBe("traversal");
  });

  it("should create instance with config", () => {
    const step = new EdgeStep({ direction: "out", edgeLabels: ["knows"] });
    expect(step).toBeInstanceOf(EdgeStep);
    expect(step.name).toBe("Edge");
  });

  it("should round-trip through JSON", () => {
    const original = new EdgeStep({ direction: "both", edgeLabels: [] });
    const json = original.toJSON();
    const restored = EdgeStep.fromJSON(json);
    expect(restored).toBeInstanceOf(EdgeStep);
    expect(restored?.config.direction).toBe("both");
  });
});

describe("RepeatStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Repeat")).toBe(true);
    expect(stepRegistry.get("Repeat")?.category).toBe("traversal");
  });

  it("should have correct static properties", () => {
    expect(RepeatStep.stepName).toBe("Repeat");
    expect(RepeatStep.category).toBe("traversal");
  });

  it("should create instance with nested steps", () => {
    const innerStep = new VertexStep({ direction: "out", edgeLabels: ["knows"] });
    const step = new RepeatStep({ times: 3, emit: true }, [innerStep]);
    expect(step).toBeInstanceOf(RepeatStep);
    expect(step.name).toBe("Repeat");
    expect(step.steps).toHaveLength(1);
    expect(step.config.times).toBe(3);
    expect(step.config.emit).toBe(true);
  });

  it("should clone preserving nested steps", () => {
    const innerStep = new VertexStep({ direction: "out", edgeLabels: ["knows"] });
    const step = new RepeatStep<readonly Step<any>[]>({ times: 2 }, [innerStep]);
    const cloned = step.clone({ times: 5 });
    expect(cloned).toBeInstanceOf(RepeatStep);
    expect(cloned.config.times).toBe(5);
    expect(cloned.steps).toHaveLength(1);
  });
});

describe("ShortestPathStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("ShortestPath")).toBe(true);
    expect(stepRegistry.get("ShortestPath")?.category).toBe("traversal");
  });

  it("should have correct static properties", () => {
    expect(ShortestPathStep.stepName).toBe("ShortestPath");
    expect(ShortestPathStep.category).toBe("traversal");
  });

  it("should create instance with config", () => {
    const step = new ShortestPathStep({
      targetId: "Person:123" as import("../../../Graph.js").ElementId,
      direction: "out",
      maxDepth: 10,
    });
    expect(step).toBeInstanceOf(ShortestPathStep);
    expect(step.name).toBe("ShortestPath");
    expect(step.config.targetId).toBe("Person:123");
    expect(step.config.maxDepth).toBe(10);
  });

  it("should round-trip through JSON", () => {
    const original = new ShortestPathStep({
      targetId: "Person:target" as import("../../../Graph.js").ElementId,
      direction: "both",
      edgeLabels: ["knows", "likes"],
      weightProperty: "cost",
      stepLabels: ["path"],
    });
    const json = original.toJSON();
    const restored = ShortestPathStep.fromJSON(json);
    expect(restored).toBeInstanceOf(ShortestPathStep);
    expect(restored?.config.targetId).toBe("Person:target");
    expect(restored?.config.direction).toBe("both");
    expect(restored?.config.weightProperty).toBe("cost");
  });
});

describe("Traversal steps registry integration", () => {
  it("should create all traversal steps via registry", () => {
    const vertex = stepRegistry.create("Vertex", { direction: "out", edgeLabels: [] });
    expect(vertex).toBeInstanceOf(VertexStep);

    const edge = stepRegistry.create("Edge", { direction: "in", edgeLabels: [] });
    expect(edge).toBeInstanceOf(EdgeStep);

    const repeat = stepRegistry.create("Repeat", { times: 2 });
    expect(repeat).toBeInstanceOf(RepeatStep);

    const shortestPath = stepRegistry.create("ShortestPath", { targetId: "X:1" });
    expect(shortestPath).toBeInstanceOf(ShortestPathStep);
  });

  it("should list all traversal steps by category", () => {
    const traversalSteps = ["Vertex", "Edge", "Repeat", "ShortestPath"];
    for (const name of traversalSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("traversal");
    }
  });
});
