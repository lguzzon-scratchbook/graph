import { describe, it, expect } from "vitest";
import { FilterElementsStep, FilterPredicateStep, DedupStep } from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";
import type { Condition } from "../../../Steps.js";

describe("FilterElementsStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("FilterElements")).toBe(true);
    expect(stepRegistry.get("FilterElements")?.category).toBe("filter");
  });

  it("should have correct static properties", () => {
    expect(FilterElementsStep.stepName).toBe("FilterElements");
    expect(FilterElementsStep.category).toBe("filter");
  });

  it("should create instance with condition", () => {
    const condition: Condition = ["=", "name", "Alice"];
    const step = new FilterElementsStep({ condition });
    expect(step).toBeInstanceOf(FilterElementsStep);
    expect(step.name).toBe("FilterElements");
    expect(step.config.condition).toEqual(condition);
  });

  it("should deserialize from JSON", () => {
    const condition: Condition = [">", "age", 25];
    const step = FilterElementsStep.fromJSON(["FilterElements", { condition }]);
    expect(step).toBeInstanceOf(FilterElementsStep);
    expect(step?.config.condition).toEqual(condition);
  });

  it("should return null for invalid JSON", () => {
    expect(FilterElementsStep.fromJSON(null)).toBeNull();
    expect(FilterElementsStep.fromJSON(["WrongName", {}])).toBeNull();
    expect(FilterElementsStep.fromJSON(["FilterElements", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const condition: Condition = ["=", "name", "Alice"];
    const step = new FilterElementsStep({ condition, stepLabels: ["a"] });
    const newCondition: Condition = ["=", "name", "Bob"];
    const cloned = step.clone({ condition: newCondition });
    expect(cloned).toBeInstanceOf(FilterElementsStep);
    expect(cloned.config.condition).toEqual(newCondition);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("FilterPredicateStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("FilterPredicate")).toBe(true);
    expect(stepRegistry.get("FilterPredicate")?.category).toBe("filter");
  });

  it("should have correct static properties", () => {
    expect(FilterPredicateStep.stepName).toBe("FilterPredicate");
    expect(FilterPredicateStep.category).toBe("filter");
  });

  it("should create instance with predicate", () => {
    const step = new FilterPredicateStep<string>({ predicate: (s) => s.length > 3 });
    expect(step).toBeInstanceOf(FilterPredicateStep);
    expect(step.name).toBe("FilterPredicate");
  });

  it("should return null from fromJSON (predicates not serializable)", () => {
    expect(FilterPredicateStep.fromJSON(["FilterPredicate", { predicate: () => true }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const predicate = (n: number) => n > 10;
    const step = new FilterPredicateStep<number>({ predicate, stepLabels: ["n"] });
    const newPredicate = (n: number) => n > 20;
    const cloned = step.clone({ predicate: newPredicate });
    expect(cloned).toBeInstanceOf(FilterPredicateStep);
    expect(cloned.config.predicate).toBe(newPredicate);
    expect(cloned.config.stepLabels).toEqual(["n"]);
  });
});

describe("DedupStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Dedup")).toBe(true);
    expect(stepRegistry.get("Dedup")?.category).toBe("filter");
  });

  it("should have correct static properties", () => {
    expect(DedupStep.stepName).toBe("Dedup");
    expect(DedupStep.category).toBe("filter");
  });

  it("should create instance", () => {
    const step = new DedupStep({});
    expect(step).toBeInstanceOf(DedupStep);
    expect(step.name).toBe("Dedup");
  });

  it("should deserialize from JSON", () => {
    const step = DedupStep.fromJSON(["Dedup", {}]);
    expect(step).toBeInstanceOf(DedupStep);
  });

  it("should return null for invalid JSON", () => {
    expect(DedupStep.fromJSON(null)).toBeNull();
    expect(DedupStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone preserving stepLabels", () => {
    const step = new DedupStep({ stepLabels: ["d"] });
    const cloned = step.clone({});
    expect(cloned).toBeInstanceOf(DedupStep);
    expect(cloned.config.stepLabels).toEqual(["d"]);
  });
});

describe("Filter steps registry integration", () => {
  it("should create all filter steps via registry", () => {
    const condition: Condition = ["=", "name", "Alice"];
    const filterElements = stepRegistry.create("FilterElements", { condition });
    expect(filterElements).toBeInstanceOf(FilterElementsStep);

    const dedup = stepRegistry.create("Dedup", {});
    expect(dedup).toBeInstanceOf(DedupStep);
  });

  it("should list all filter steps by category", () => {
    const filterSteps = ["FilterElements", "FilterPredicate", "Dedup"];
    for (const name of filterSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("filter");
    }
  });
});
