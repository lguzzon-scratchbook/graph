import { describe, it, expect } from "vitest";
import {
  CountStep,
  SumStep,
  AvgStep,
  MinStep,
  MaxStep,
  CollectStep,
  GroupByStep,
} from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";

describe("CountStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Count")).toBe(true);
    expect(stepRegistry.get("Count")?.category).toBe("aggregate");
  });

  it("should have correct static properties", () => {
    expect(CountStep.stepName).toBe("Count");
    expect(CountStep.category).toBe("aggregate");
  });

  it("should create instance", () => {
    const step = new CountStep({});
    expect(step).toBeInstanceOf(CountStep);
    expect(step.name).toBe("Count");
  });

  it("should deserialize from JSON", () => {
    const step = CountStep.fromJSON(["Count", {}]);
    expect(step).toBeInstanceOf(CountStep);
  });

  it("should return null for invalid JSON", () => {
    expect(CountStep.fromJSON(null)).toBeNull();
    expect(CountStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone preserving stepLabels", () => {
    const step = new CountStep({ stepLabels: ["c"] });
    const cloned = step.clone({});
    expect(cloned).toBeInstanceOf(CountStep);
    expect(cloned.config.stepLabels).toEqual(["c"]);
  });
});

describe("SumStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Sum")).toBe(true);
    expect(stepRegistry.get("Sum")?.category).toBe("aggregate");
  });

  it("should create instance with property", () => {
    const step = new SumStep({ property: "age" });
    expect(step).toBeInstanceOf(SumStep);
    expect(step.name).toBe("Sum");
    expect(step.config.property).toBe("age");
  });

  it("should round-trip through JSON", () => {
    const original = new SumStep({ property: "salary", variable: "e" });
    const json = original.toJSON();
    const restored = SumStep.fromJSON(json);
    expect(restored).toBeInstanceOf(SumStep);
    expect(restored?.config.property).toBe("salary");
    expect(restored?.config.variable).toBe("e");
  });
});

describe("AvgStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Avg")).toBe(true);
    expect(stepRegistry.get("Avg")?.category).toBe("aggregate");
  });

  it("should create instance with property", () => {
    const step = new AvgStep({ property: "score" });
    expect(step).toBeInstanceOf(AvgStep);
    expect(step.name).toBe("Avg");
  });

  it("should clone with partial config", () => {
    const step = new AvgStep({ property: "price", stepLabels: ["avg"] });
    const cloned = step.clone({ property: "cost" });
    expect(cloned).toBeInstanceOf(AvgStep);
    expect(cloned.config.property).toBe("cost");
    expect(cloned.config.stepLabels).toEqual(["avg"]);
  });
});

describe("MinStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Min")).toBe(true);
    expect(stepRegistry.get("Min")?.category).toBe("aggregate");
  });

  it("should create instance", () => {
    const step = new MinStep({ property: "date" });
    expect(step).toBeInstanceOf(MinStep);
    expect(step.name).toBe("Min");
  });

  it("should round-trip through JSON", () => {
    const original = new MinStep({ property: "value" });
    const json = original.toJSON();
    const restored = MinStep.fromJSON(json);
    expect(restored).toBeInstanceOf(MinStep);
    expect(restored?.config.property).toBe("value");
  });
});

describe("MaxStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Max")).toBe(true);
    expect(stepRegistry.get("Max")?.category).toBe("aggregate");
  });

  it("should create instance", () => {
    const step = new MaxStep({ property: "date" });
    expect(step).toBeInstanceOf(MaxStep);
    expect(step.name).toBe("Max");
  });
});

describe("CollectStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Collect")).toBe(true);
    expect(stepRegistry.get("Collect")?.category).toBe("aggregate");
  });

  it("should have correct static properties", () => {
    expect(CollectStep.stepName).toBe("Collect");
    expect(CollectStep.category).toBe("aggregate");
  });

  it("should create instance with variable", () => {
    const step = new CollectStep({ variable: "n" });
    expect(step).toBeInstanceOf(CollectStep);
    expect(step.name).toBe("Collect");
    expect(step.config.variable).toBe("n");
  });

  it("should round-trip through JSON", () => {
    const original = new CollectStep({ variable: "items", stepLabels: ["collected"] });
    const json = original.toJSON();
    const restored = CollectStep.fromJSON(json);
    expect(restored).toBeInstanceOf(CollectStep);
    expect(restored?.config.variable).toBe("items");
    expect(restored?.config.stepLabels).toEqual(["collected"]);
  });
});

describe("GroupByStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("GroupBy")).toBe(true);
    expect(stepRegistry.get("GroupBy")?.category).toBe("aggregate");
  });

  it("should have correct static properties", () => {
    expect(GroupByStep.stepName).toBe("GroupBy");
    expect(GroupByStep.category).toBe("aggregate");
  });

  it("should create instance with groupByItems and returnItems", () => {
    const step = new GroupByStep({
      groupByItems: [{ variable: "n", property: "category" }],
      returnItems: [{ variable: "n", property: "value", aggregate: "SUM", alias: "total" }],
    });
    expect(step).toBeInstanceOf(GroupByStep);
    expect(step.name).toBe("GroupBy");
    expect(step.config.groupByItems).toHaveLength(1);
    expect(step.config.returnItems).toHaveLength(1);
  });

  it("should round-trip through JSON", () => {
    const original = new GroupByStep({
      groupByItems: [{ variable: "n", property: "type" }],
      returnItems: [{ variable: "n", aggregate: "COUNT", alias: "count" }],
      stepLabels: ["grouped"],
    });
    const json = original.toJSON();
    const restored = GroupByStep.fromJSON(json);
    expect(restored).toBeInstanceOf(GroupByStep);
    expect(restored?.config.groupByItems).toHaveLength(1);
    expect(restored?.config.returnItems).toHaveLength(1);
    expect(restored?.config.stepLabels).toEqual(["grouped"]);
  });

  it("should return null for missing groupByItems", () => {
    expect(GroupByStep.fromJSON(["GroupBy", { returnItems: [] }])).toBeNull();
  });

  it("should return null for missing returnItems", () => {
    expect(GroupByStep.fromJSON(["GroupBy", { groupByItems: [] }])).toBeNull();
  });
});

describe("Aggregate steps registry integration", () => {
  it("should create all aggregate steps via registry", () => {
    const count = stepRegistry.create("Count", {});
    expect(count).toBeInstanceOf(CountStep);

    const sum = stepRegistry.create("Sum", { property: "value" });
    expect(sum).toBeInstanceOf(SumStep);

    const avg = stepRegistry.create("Avg", { property: "value" });
    expect(avg).toBeInstanceOf(AvgStep);

    const min = stepRegistry.create("Min", { property: "value" });
    expect(min).toBeInstanceOf(MinStep);

    const max = stepRegistry.create("Max", { property: "value" });
    expect(max).toBeInstanceOf(MaxStep);

    const collect = stepRegistry.create("Collect", {});
    expect(collect).toBeInstanceOf(CollectStep);

    const groupBy = stepRegistry.create("GroupBy", {
      groupByItems: [{ variable: "n" }],
      returnItems: [{ variable: "n", aggregate: "COUNT" }],
    });
    expect(groupBy).toBeInstanceOf(GroupByStep);
  });

  it("should list all aggregate steps by category", () => {
    const aggregateSteps = ["Count", "Sum", "Avg", "Min", "Max", "Collect", "GroupBy"];
    for (const name of aggregateSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("aggregate");
    }
  });
});
