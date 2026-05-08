import { describe, it, expect } from "vitest";
import { UnionStep, IntersectStep, QueryUnionStep, MultiQueryStep } from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";

describe("UnionStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Union")).toBe(true);
    expect(stepRegistry.get("Union")?.category).toBe("setops");
  });

  it("should have correct static properties", () => {
    expect(UnionStep.stepName).toBe("Union");
    expect(UnionStep.category).toBe("setops");
  });

  it("should create instance with nested steps", () => {
    const step = new UnionStep({}, []);
    expect(step).toBeInstanceOf(UnionStep);
    expect(step.name).toBe("Union");
  });

  it("should round-trip through JSON (basic)", () => {
    const original = new UnionStep({ stepLabels: ["u"] }, []);
    const json = original.toJSON();
    const restored = UnionStep.fromJSON(json);
    expect(restored).toBeInstanceOf(UnionStep);
    expect(restored?.config.stepLabels).toEqual(["u"]);
  });

  it("should return null for invalid JSON", () => {
    expect(UnionStep.fromJSON(null)).toBeNull();
    expect(UnionStep.fromJSON(["WrongName", {}])).toBeNull();
    expect(UnionStep.fromJSON(["Union", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new UnionStep({ stepLabels: ["a"] }, []);
    const cloned = step.clone({});
    expect(cloned).toBeInstanceOf(UnionStep);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("IntersectStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Intersect")).toBe(true);
    expect(stepRegistry.get("Intersect")?.category).toBe("setops");
  });

  it("should have correct static properties", () => {
    expect(IntersectStep.stepName).toBe("Intersect");
    expect(IntersectStep.category).toBe("setops");
  });

  it("should create instance with nested steps", () => {
    const step = new IntersectStep({}, []);
    expect(step).toBeInstanceOf(IntersectStep);
    expect(step.name).toBe("Intersect");
  });

  it("should round-trip through JSON (basic)", () => {
    const original = new IntersectStep({ stepLabels: ["i"] }, []);
    const json = original.toJSON();
    const restored = IntersectStep.fromJSON(json);
    expect(restored).toBeInstanceOf(IntersectStep);
    expect(restored?.config.stepLabels).toEqual(["i"]);
  });

  it("should return null for invalid JSON", () => {
    expect(IntersectStep.fromJSON(null)).toBeNull();
    expect(IntersectStep.fromJSON(["Intersect", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new IntersectStep({ stepLabels: ["a"] }, []);
    const cloned = step.clone({});
    expect(cloned).toBeInstanceOf(IntersectStep);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("QueryUnionStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("QueryUnion")).toBe(true);
    expect(stepRegistry.get("QueryUnion")?.category).toBe("setops");
  });

  it("should have correct static properties", () => {
    expect(QueryUnionStep.stepName).toBe("QueryUnion");
    expect(QueryUnionStep.category).toBe("setops");
  });

  it("should create instance for UNION (distinct)", () => {
    const step = new QueryUnionStep({ all: false }, []);
    expect(step).toBeInstanceOf(QueryUnionStep);
    expect(step.name).toBe("QueryUnion");
    expect(step.config.all).toBe(false);
  });

  it("should create instance for UNION ALL", () => {
    const step = new QueryUnionStep({ all: true }, []);
    expect(step.name).toBe("QueryUnionAll");
    expect(step.config.all).toBe(true);
  });

  it("should round-trip through JSON for UNION", () => {
    const original = new QueryUnionStep({ all: false, stepLabels: ["qu"] }, []);
    const json = original.toJSON();
    const restored = QueryUnionStep.fromJSON(json);
    expect(restored).toBeInstanceOf(QueryUnionStep);
    expect(restored?.config.all).toBe(false);
    expect(restored?.config.stepLabels).toEqual(["qu"]);
  });

  it("should round-trip through JSON for UNION ALL", () => {
    const original = new QueryUnionStep({ all: true }, []);
    const json = original.toJSON();
    const restored = QueryUnionStep.fromJSON(json);
    expect(restored?.config.all).toBe(true);
  });

  it("should return null for invalid JSON", () => {
    expect(QueryUnionStep.fromJSON(null)).toBeNull();
    expect(QueryUnionStep.fromJSON(["QueryUnion", {}])).toBeNull();
    expect(QueryUnionStep.fromJSON(["QueryUnion", { all: "yes" }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new QueryUnionStep({ all: false, stepLabels: ["a"] }, []);
    const cloned = step.clone({ all: true });
    expect(cloned).toBeInstanceOf(QueryUnionStep);
    expect(cloned.config.all).toBe(true);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("MultiQueryStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("MultiQuery")).toBe(true);
    expect(stepRegistry.get("MultiQuery")?.category).toBe("setops");
  });

  it("should have correct static properties", () => {
    expect(MultiQueryStep.stepName).toBe("MultiQuery");
    expect(MultiQueryStep.category).toBe("setops");
  });

  it("should create instance with statements", () => {
    const step = new MultiQueryStep({}, []);
    expect(step).toBeInstanceOf(MultiQueryStep);
    expect(step.name).toBe("MultiQuery");
  });

  it("should round-trip through JSON (basic)", () => {
    const original = new MultiQueryStep({ stepLabels: ["mq"] }, []);
    const json = original.toJSON();
    const restored = MultiQueryStep.fromJSON(json);
    expect(restored).toBeInstanceOf(MultiQueryStep);
    expect(restored?.config.stepLabels).toEqual(["mq"]);
  });

  it("should return null for invalid JSON", () => {
    expect(MultiQueryStep.fromJSON(null)).toBeNull();
    expect(MultiQueryStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new MultiQueryStep({ stepLabels: ["a"] }, []);
    const cloned = step.clone({});
    expect(cloned).toBeInstanceOf(MultiQueryStep);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("Setop steps registry integration", () => {
  it("should create all setop steps via registry", () => {
    const union = stepRegistry.create("Union", {});
    expect(union).toBeInstanceOf(UnionStep);

    const intersect = stepRegistry.create("Intersect", {});
    expect(intersect).toBeInstanceOf(IntersectStep);

    const queryUnion = stepRegistry.create("QueryUnion", { all: false });
    expect(queryUnion).toBeInstanceOf(QueryUnionStep);

    const multiQuery = stepRegistry.create("MultiQuery", {});
    expect(multiQuery).toBeInstanceOf(MultiQueryStep);
  });

  it("should list all setop steps by category", () => {
    const setopSteps = ["Union", "Intersect", "QueryUnion", "MultiQuery"];
    for (const name of setopSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("setops");
    }
  });
});
