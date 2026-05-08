import { describe, it, expect } from "vitest";
import {
  RangeStep,
  OrderStep,
  OptionalMatchStep,
  WithStep,
  UnwindStep,
  ForeachStep,
} from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";
import type { OrderDirection, NullsOrdering } from "../../../Steps.js";

describe("RangeStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Range")).toBe(true);
    expect(stepRegistry.get("Range")?.category).toBe("control");
  });

  it("should have correct static properties", () => {
    expect(RangeStep.stepName).toBe("Range");
    expect(RangeStep.category).toBe("control");
  });

  it("should create instance with start and end", () => {
    const step = new RangeStep({ start: 0, end: 10 });
    expect(step).toBeInstanceOf(RangeStep);
    expect(step.name).toBe("Range");
    expect(step.config.start).toBe(0);
    expect(step.config.end).toBe(10);
  });

  it("should round-trip through JSON", () => {
    const original = new RangeStep({ start: 5, end: 20, stepLabels: ["r"] });
    const json = original.toJSON();
    const restored = RangeStep.fromJSON(json);
    expect(restored).toBeInstanceOf(RangeStep);
    expect(restored?.config.start).toBe(5);
    expect(restored?.config.end).toBe(20);
    expect(restored?.config.stepLabels).toEqual(["r"]);
  });

  it("should return null for invalid JSON", () => {
    expect(RangeStep.fromJSON(null)).toBeNull();
    expect(RangeStep.fromJSON(["WrongName", {}])).toBeNull();
    expect(RangeStep.fromJSON(["Range", {}])).toBeNull();
    expect(RangeStep.fromJSON(["Range", { start: 0 }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new RangeStep({ start: 0, end: 10, stepLabels: ["a"] });
    const cloned = step.clone({ start: 5 });
    expect(cloned).toBeInstanceOf(RangeStep);
    expect(cloned.config.start).toBe(5);
    expect(cloned.config.end).toBe(10);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("OrderStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Order")).toBe(true);
    expect(stepRegistry.get("Order")?.category).toBe("control");
  });

  it("should have correct static properties", () => {
    expect(OrderStep.stepName).toBe("Order");
    expect(OrderStep.category).toBe("control");
  });

  it("should create instance with directions", () => {
    const directions: { key: string; direction: OrderDirection; nulls?: NullsOrdering }[] = [
      { key: "name", direction: "asc", nulls: "last" },
      { key: "age", direction: "desc" },
    ];
    const step = new OrderStep({ directions });
    expect(step).toBeInstanceOf(OrderStep);
    expect(step.name).toBe("Order");
    expect(step.config.directions).toHaveLength(2);
  });

  it("should round-trip through JSON", () => {
    const directions: { key: string; direction: OrderDirection; nulls?: NullsOrdering }[] = [
      { key: "name", direction: "asc", nulls: "last" },
    ];
    const original = new OrderStep({ directions, stepLabels: ["o"] });
    const json = original.toJSON();
    const restored = OrderStep.fromJSON(json);
    expect(restored).toBeInstanceOf(OrderStep);
    expect(restored?.config.directions).toHaveLength(1);
    expect(restored?.config.stepLabels).toEqual(["o"]);
  });

  it("should return null for invalid JSON", () => {
    expect(OrderStep.fromJSON(null)).toBeNull();
    expect(OrderStep.fromJSON(["Order", {}])).toBeNull();
    expect(OrderStep.fromJSON(["Order", { directions: "invalid" }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const directions = [{ key: "name", direction: "asc" as const }];
    const newDirections = [{ key: "age", direction: "desc" as const }];
    const step = new OrderStep({ directions, stepLabels: ["o"] });
    const cloned = step.clone({ directions: newDirections });
    expect(cloned).toBeInstanceOf(OrderStep);
    expect(cloned.config.directions).toEqual(newDirections);
    expect(cloned.config.stepLabels).toEqual(["o"]);
  });
});

describe("OptionalMatchStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("OptionalMatch")).toBe(true);
    expect(stepRegistry.get("OptionalMatch")?.category).toBe("control");
  });

  it("should have correct static properties", () => {
    expect(OptionalMatchStep.stepName).toBe("OptionalMatch");
    expect(OptionalMatchStep.category).toBe("control");
  });

  it("should create instance with variables", () => {
    const step = new OptionalMatchStep({ variables: ["n", "r"] }, []);
    expect(step).toBeInstanceOf(OptionalMatchStep);
    expect(step.name).toBe("OptionalMatch");
    expect(step.config.variables).toEqual(["n", "r"]);
  });

  it("should round-trip through JSON (basic)", () => {
    const original = new OptionalMatchStep({ variables: ["n"], stepLabels: ["opt"] }, []);
    const json = original.toJSON();
    const restored = OptionalMatchStep.fromJSON(json);
    expect(restored).toBeInstanceOf(OptionalMatchStep);
    expect(restored?.config.variables).toEqual(["n"]);
    expect(restored?.config.stepLabels).toEqual(["opt"]);
  });

  it("should return null for invalid JSON", () => {
    expect(OptionalMatchStep.fromJSON(null)).toBeNull();
    expect(OptionalMatchStep.fromJSON(["OptionalMatch", {}])).toBeNull();
    expect(OptionalMatchStep.fromJSON(["OptionalMatch", { variables: "n" }, []])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new OptionalMatchStep({ variables: ["n"], stepLabels: ["a"] }, []);
    const cloned = step.clone({ variables: ["m", "r"] });
    expect(cloned).toBeInstanceOf(OptionalMatchStep);
    expect(cloned.config.variables).toEqual(["m", "r"]);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("WithStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("With")).toBe(true);
    expect(stepRegistry.get("With")?.category).toBe("control");
  });

  it("should have correct static properties", () => {
    expect(WithStep.stepName).toBe("With");
    expect(WithStep.category).toBe("control");
  });

  it("should create instance with items", () => {
    const items = [{ type: "variable" as const, sourceVariable: "n", alias: "node" }];
    const step = new WithStep({ distinct: false, items });
    expect(step).toBeInstanceOf(WithStep);
    expect(step.name).toBe("With");
    expect(step.config.items).toHaveLength(1);
    expect(step.config.distinct).toBe(false);
  });

  it("should create instance with complex config", () => {
    const items = [
      { type: "variable" as const, sourceVariable: "n", alias: "node" },
      { type: "property" as const, sourceVariable: "n", property: "name", alias: "name" },
    ];
    const orderBy = [{ key: "name", direction: "asc" as const, nulls: "last" as const }];
    const step = new WithStep({
      distinct: true,
      items,
      orderBy,
      skip: 10,
      limit: 20,
    });
    expect(step.config.distinct).toBe(true);
    expect(step.config.orderBy).toHaveLength(1);
    expect(step.config.skip).toBe(10);
    expect(step.config.limit).toBe(20);
  });

  it("should round-trip through JSON", () => {
    const items = [{ type: "variable" as const, sourceVariable: "n", alias: "node" }];
    const original = new WithStep({ distinct: false, items, stepLabels: ["w"] });
    const json = original.toJSON();
    const restored = WithStep.fromJSON(json);
    expect(restored).toBeInstanceOf(WithStep);
    expect(restored?.config.items).toHaveLength(1);
    expect(restored?.config.distinct).toBe(false);
    expect(restored?.config.stepLabels).toEqual(["w"]);
  });

  it("should return null for invalid JSON", () => {
    expect(WithStep.fromJSON(null)).toBeNull();
    expect(WithStep.fromJSON(["With", {}])).toBeNull();
    expect(WithStep.fromJSON(["With", { items: [] }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const items = [{ type: "variable" as const, sourceVariable: "n", alias: "node" }];
    const newItems = [{ type: "variable" as const, sourceVariable: "m", alias: "other" }];
    const step = new WithStep({ distinct: false, items, stepLabels: ["w"] });
    const cloned = step.clone({ items: newItems, distinct: true });
    expect(cloned).toBeInstanceOf(WithStep);
    expect(cloned.config.items).toEqual(newItems);
    expect(cloned.config.distinct).toBe(true);
    expect(cloned.config.stepLabels).toEqual(["w"]);
  });
});

describe("UnwindStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Unwind")).toBe(true);
    expect(stepRegistry.get("Unwind")?.category).toBe("control");
  });

  it("should have correct static properties", () => {
    expect(UnwindStep.stepName).toBe("Unwind");
    expect(UnwindStep.category).toBe("control");
  });

  it("should create instance with literal expression", () => {
    const step = new UnwindStep({
      expression: { type: "literal", values: [1, 2, 3] },
      alias: "x",
    });
    expect(step).toBeInstanceOf(UnwindStep);
    expect(step.name).toBe("Unwind");
    expect(step.config.alias).toBe("x");
    expect(step.config.expression.type).toBe("literal");
  });

  it("should create instance with property expression", () => {
    const step = new UnwindStep({
      expression: { type: "property", variable: "n", property: "items" },
      alias: "item",
    });
    expect(step.config.expression.type).toBe("property");
  });

  it("should round-trip through JSON", () => {
    const original = new UnwindStep({
      expression: { type: "literal", values: ["a", "b", "c"] },
      alias: "letter",
      stepLabels: ["u"],
    });
    const json = original.toJSON();
    const restored = UnwindStep.fromJSON(json);
    expect(restored).toBeInstanceOf(UnwindStep);
    expect(restored?.config.alias).toBe("letter");
    expect(restored?.config.expression.type).toBe("literal");
    expect(restored?.config.stepLabels).toEqual(["u"]);
  });

  it("should return null for invalid JSON", () => {
    expect(UnwindStep.fromJSON(null)).toBeNull();
    expect(UnwindStep.fromJSON(["Unwind", {}])).toBeNull();
    expect(UnwindStep.fromJSON(["Unwind", { alias: "x" }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new UnwindStep({
      expression: { type: "literal", values: [1, 2] },
      alias: "old",
      stepLabels: ["u"],
    });
    const cloned = step.clone({ alias: "new" });
    expect(cloned).toBeInstanceOf(UnwindStep);
    expect(cloned.config.alias).toBe("new");
    expect(cloned.config.expression.type).toBe("literal");
    expect(cloned.config.stepLabels).toEqual(["u"]);
  });
});

describe("ForeachStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Foreach")).toBe(true);
    expect(stepRegistry.get("Foreach")?.category).toBe("control");
  });

  it("should have correct static properties", () => {
    expect(ForeachStep.stepName).toBe("Foreach");
    expect(ForeachStep.category).toBe("control");
  });

  it("should create instance with variable and literal list", () => {
    const step = new ForeachStep(
      {
        variable: "x",
        listExpression: { type: "literal", values: [1, 2, 3] },
      },
      [],
    );
    expect(step).toBeInstanceOf(ForeachStep);
    expect(step.name).toBe("Foreach");
    expect(step.config.variable).toBe("x");
    expect(step.config.listExpression?.type).toBe("literal");
  });

  it("should create instance with property access", () => {
    const step = new ForeachStep(
      {
        variable: "item",
        listExpression: { type: "property", variable: "n", property: "items" },
      },
      [],
    );
    expect(step.config.listExpression?.type).toBe("property");
  });

  it("should round-trip through JSON (basic)", () => {
    const original = new ForeachStep(
      {
        variable: "x",
        listExpression: { type: "literal", values: ["a", "b"] },
        stepLabels: ["fe"],
      },
      [],
    );
    const json = original.toJSON();
    const restored = ForeachStep.fromJSON(json);
    expect(restored).toBeInstanceOf(ForeachStep);
    expect(restored?.config.variable).toBe("x");
    expect(restored?.config.stepLabels).toEqual(["fe"]);
  });

  it("should return null for invalid JSON", () => {
    expect(ForeachStep.fromJSON(null)).toBeNull();
    expect(ForeachStep.fromJSON(["Foreach", {}])).toBeNull();
    expect(ForeachStep.fromJSON(["Foreach", { variable: 123 }, []])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new ForeachStep(
      {
        variable: "old",
        listExpression: { type: "literal", values: [1] },
        stepLabels: ["a"],
      },
      [],
    );
    const cloned = step.clone({ variable: "new" });
    expect(cloned).toBeInstanceOf(ForeachStep);
    expect(cloned.config.variable).toBe("new");
    expect(cloned.config.listExpression?.type).toBe("literal");
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("Control steps registry integration", () => {
  it("should create all control steps via registry", () => {
    const range = stepRegistry.create("Range", { start: 0, end: 10 });
    expect(range).toBeInstanceOf(RangeStep);

    const order = stepRegistry.create("Order", { directions: [] });
    expect(order).toBeInstanceOf(OrderStep);

    const optional = stepRegistry.create("OptionalMatch", { variables: ["n"] });
    expect(optional).toBeInstanceOf(OptionalMatchStep);

    const withStep = stepRegistry.create("With", { distinct: false, items: [] });
    expect(withStep).toBeInstanceOf(WithStep);

    const unwind = stepRegistry.create("Unwind", {
      expression: { type: "literal", values: [] },
      alias: "x",
    });
    expect(unwind).toBeInstanceOf(UnwindStep);

    const foreach = stepRegistry.create("Foreach", { variable: "x" });
    expect(foreach).toBeInstanceOf(ForeachStep);
  });

  it("should list all control steps by category", () => {
    const controlSteps = ["Range", "Order", "OptionalMatch", "With", "Unwind", "Foreach"];
    for (const name of controlSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("control");
    }
  });
});
