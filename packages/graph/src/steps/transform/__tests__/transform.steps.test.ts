import { describe, it, expect } from "vitest";
import {
  MapElementsStep,
  ValuesStep,
  PropertyValuesStep,
  LabelsStep,
  SelectStep,
  UnfoldStep,
  BindPathStep,
  CallStep,
  ExpressionReturnStep,
} from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";

describe("MapElementsStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("MapElements")).toBe(true);
    expect(stepRegistry.get("MapElements")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(MapElementsStep.stepName).toBe("MapElements");
    expect(MapElementsStep.category).toBe("transform");
  });

  it("should create instance with mapper function", () => {
    const step = new MapElementsStep({ mapper: (x: number) => x * 2 });
    expect(step).toBeInstanceOf(MapElementsStep);
    expect(step.name).toBe("MapElements");
  });

  it("should return null from fromJSON (not serializable)", () => {
    // MapElementsStep cannot be serialized because it contains a function
    expect(MapElementsStep.fromJSON(["MapElements", {}])).toBeNull();
    expect(MapElementsStep.fromJSON(null)).toBeNull();
  });

  it("should throw when calling toJSON", () => {
    const step = new MapElementsStep({ mapper: (x: number) => x });
    expect(() => step.toJSON()).toThrow("Cannot convert MapElementsStep to JSON");
  });

  it("should clone with partial config", () => {
    const mapper = (x: number) => x + 1;
    const newMapper = (x: number) => x * 2;
    const step = new MapElementsStep({ mapper, stepLabels: ["m"] });
    const cloned = step.clone({ mapper: newMapper });
    expect(cloned).toBeInstanceOf(MapElementsStep);
    expect(cloned.config.stepLabels).toEqual(["m"]);
  });
});

describe("ValuesStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Values")).toBe(true);
    expect(stepRegistry.get("Values")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(ValuesStep.stepName).toBe("Values");
    expect(ValuesStep.category).toBe("transform");
  });

  it("should create instance", () => {
    const step = new ValuesStep({});
    expect(step).toBeInstanceOf(ValuesStep);
    expect(step.name).toBe("Values");
  });

  it("should round-trip through JSON", () => {
    const original = new ValuesStep({ stepLabels: ["v"] });
    const json = original.toJSON();
    const restored = ValuesStep.fromJSON(json);
    expect(restored).toBeInstanceOf(ValuesStep);
    expect(restored?.config.stepLabels).toEqual(["v"]);
  });

  it("should return null for invalid JSON", () => {
    expect(ValuesStep.fromJSON(null)).toBeNull();
    expect(ValuesStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new ValuesStep({ stepLabels: ["a"] });
    const cloned = step.clone({});
    expect(cloned).toBeInstanceOf(ValuesStep);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("PropertyValuesStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("PropertyValues")).toBe(true);
    expect(stepRegistry.get("PropertyValues")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(PropertyValuesStep.stepName).toBe("PropertyValues");
    expect(PropertyValuesStep.category).toBe("transform");
  });

  it("should create instance with items", () => {
    const items = [{ variable: "n", property: "name" }, { variable: "n" }];
    const step = new PropertyValuesStep({ items });
    expect(step).toBeInstanceOf(PropertyValuesStep);
    expect(step.name).toBe("PropertyValues");
    expect(step.config.items).toHaveLength(2);
  });

  it("should round-trip through JSON", () => {
    const items = [{ variable: "n", property: "name" }];
    const original = new PropertyValuesStep({ items, stepLabels: ["p"] });
    const json = original.toJSON();
    const restored = PropertyValuesStep.fromJSON(json);
    expect(restored).toBeInstanceOf(PropertyValuesStep);
    expect(restored?.config.items).toEqual(items);
    expect(restored?.config.stepLabels).toEqual(["p"]);
  });

  it("should return null for invalid JSON", () => {
    expect(PropertyValuesStep.fromJSON(null)).toBeNull();
    expect(PropertyValuesStep.fromJSON(["PropertyValues", {}])).toBeNull();
    expect(PropertyValuesStep.fromJSON(["PropertyValues", { items: "invalid" }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const items = [{ variable: "n", property: "name" }];
    const newItems = [{ variable: "m" }];
    const step = new PropertyValuesStep({ items, stepLabels: ["p"] });
    const cloned = step.clone({ items: newItems });
    expect(cloned).toBeInstanceOf(PropertyValuesStep);
    expect(cloned.config.items).toEqual(newItems);
    expect(cloned.config.stepLabels).toEqual(["p"]);
  });
});

describe("LabelsStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Labels")).toBe(true);
    expect(stepRegistry.get("Labels")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(LabelsStep.stepName).toBe("Labels");
    expect(LabelsStep.category).toBe("transform");
  });

  it("should create instance for labels() (array mode)", () => {
    const step = new LabelsStep({ returnAsString: false });
    expect(step).toBeInstanceOf(LabelsStep);
    expect(step.name).toBe("Labels");
    expect(step.config.returnAsString).toBe(false);
  });

  it("should create instance for type() (string mode)", () => {
    const step = new LabelsStep({ returnAsString: true });
    expect(step.config.returnAsString).toBe(true);
  });

  it("should round-trip through JSON", () => {
    const original = new LabelsStep({ returnAsString: true, stepLabels: ["l"] });
    const json = original.toJSON();
    const restored = LabelsStep.fromJSON(json);
    expect(restored).toBeInstanceOf(LabelsStep);
    expect(restored?.config.returnAsString).toBe(true);
    expect(restored?.config.stepLabels).toEqual(["l"]);
  });

  it("should return null for invalid JSON", () => {
    expect(LabelsStep.fromJSON(null)).toBeNull();
    expect(LabelsStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new LabelsStep({ returnAsString: false, stepLabels: ["a"] });
    const cloned = step.clone({ returnAsString: true });
    expect(cloned).toBeInstanceOf(LabelsStep);
    expect(cloned.config.returnAsString).toBe(true);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("SelectStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Select")).toBe(true);
    expect(stepRegistry.get("Select")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(SelectStep.stepName).toBe("Select");
    expect(SelectStep.category).toBe("transform");
  });

  it("should create instance with path labels", () => {
    const step = new SelectStep({ pathLabels: ["a", "b", "c"] });
    expect(step).toBeInstanceOf(SelectStep);
    expect(step.name).toBe("Select");
    expect(step.config.pathLabels).toEqual(["a", "b", "c"]);
  });

  it("should round-trip through JSON", () => {
    const original = new SelectStep({ pathLabels: ["p", "r"], stepLabels: ["s"] });
    const json = original.toJSON();
    const restored = SelectStep.fromJSON(json);
    expect(restored).toBeInstanceOf(SelectStep);
    expect(restored?.config.pathLabels).toEqual(["p", "r"]);
    expect(restored?.config.stepLabels).toEqual(["s"]);
  });

  it("should return null for invalid JSON", () => {
    expect(SelectStep.fromJSON(null)).toBeNull();
    expect(SelectStep.fromJSON(["Select", {}])).toBeNull();
    expect(SelectStep.fromJSON(["Select", { pathLabels: "invalid" }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new SelectStep({ pathLabels: ["a"], stepLabels: ["s"] });
    const cloned = step.clone({ pathLabels: ["b", "c"] });
    expect(cloned).toBeInstanceOf(SelectStep);
    expect(cloned.config.pathLabels).toEqual(["b", "c"]);
    expect(cloned.config.stepLabels).toEqual(["s"]);
  });
});

describe("UnfoldStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Unfold")).toBe(true);
    expect(stepRegistry.get("Unfold")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(UnfoldStep.stepName).toBe("Unfold");
    expect(UnfoldStep.category).toBe("transform");
  });

  it("should create instance", () => {
    const step = new UnfoldStep({});
    expect(step).toBeInstanceOf(UnfoldStep);
    expect(step.name).toBe("Unfold");
  });

  it("should round-trip through JSON", () => {
    const original = new UnfoldStep({ stepLabels: ["u"] });
    const json = original.toJSON();
    const restored = UnfoldStep.fromJSON(json);
    expect(restored).toBeInstanceOf(UnfoldStep);
    expect(restored?.config.stepLabels).toEqual(["u"]);
  });

  it("should return null for invalid JSON", () => {
    expect(UnfoldStep.fromJSON(null)).toBeNull();
    expect(UnfoldStep.fromJSON(["WrongName", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new UnfoldStep({ stepLabels: ["a"] });
    const cloned = step.clone({});
    expect(cloned).toBeInstanceOf(UnfoldStep);
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("BindPathStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("BindPath")).toBe(true);
    expect(stepRegistry.get("BindPath")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(BindPathStep.stepName).toBe("BindPath");
    expect(BindPathStep.category).toBe("transform");
  });

  it("should create instance with path variable", () => {
    const step = new BindPathStep({ pathVariable: "p" });
    expect(step).toBeInstanceOf(BindPathStep);
    expect(step.name).toBe("BindPath");
    expect(step.config.pathVariable).toBe("p");
  });

  it("should round-trip through JSON", () => {
    const original = new BindPathStep({ pathVariable: "path", stepLabels: ["bp"] });
    const json = original.toJSON();
    const restored = BindPathStep.fromJSON(json);
    expect(restored).toBeInstanceOf(BindPathStep);
    expect(restored?.config.pathVariable).toBe("path");
    expect(restored?.config.stepLabels).toEqual(["bp"]);
  });

  it("should return null for invalid JSON", () => {
    expect(BindPathStep.fromJSON(null)).toBeNull();
    expect(BindPathStep.fromJSON(["BindPath", {}])).toBeNull();
    expect(BindPathStep.fromJSON(["BindPath", { pathVariable: 123 }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new BindPathStep({ pathVariable: "old", stepLabels: ["a"] });
    const cloned = step.clone({ pathVariable: "new" });
    expect(cloned).toBeInstanceOf(BindPathStep);
    expect(cloned.config.pathVariable).toBe("new");
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("CallStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Call")).toBe(true);
    expect(stepRegistry.get("Call")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(CallStep.stepName).toBe("Call");
    expect(CallStep.category).toBe("transform");
  });

  it("should create instance with procedure name and arguments", () => {
    const step = new CallStep({
      procedureName: "db.labels",
      arguments: [],
    });
    expect(step).toBeInstanceOf(CallStep);
    expect(step.name).toBe("Call");
    expect(step.config.procedureName).toBe("db.labels");
  });

  it("should create instance with yield items", () => {
    const step = new CallStep({
      procedureName: "db.labels",
      arguments: [],
      yieldItems: [{ name: "label", alias: "l" }],
    });
    expect(step.config.yieldItems).toHaveLength(1);
  });

  it("should round-trip through JSON", () => {
    const original = new CallStep({
      procedureName: "db.labels",
      arguments: [],
      yieldItems: [{ name: "label" }],
      stepLabels: ["c"],
    });
    const json = original.toJSON();
    const restored = CallStep.fromJSON(json);
    expect(restored).toBeInstanceOf(CallStep);
    expect(restored?.config.procedureName).toBe("db.labels");
    expect(restored?.config.stepLabels).toEqual(["c"]);
  });

  it("should return null for invalid JSON", () => {
    expect(CallStep.fromJSON(null)).toBeNull();
    expect(CallStep.fromJSON(["Call", {}])).toBeNull();
    expect(CallStep.fromJSON(["Call", { procedureName: "test" }])).toBeNull();
    expect(CallStep.fromJSON(["Call", { arguments: [] }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const step = new CallStep({
      procedureName: "old.proc",
      arguments: [],
      stepLabels: ["a"],
    });
    const cloned = step.clone({ procedureName: "new.proc" });
    expect(cloned).toBeInstanceOf(CallStep);
    expect(cloned.config.procedureName).toBe("new.proc");
    expect(cloned.config.stepLabels).toEqual(["a"]);
  });
});

describe("ExpressionReturnStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("ExpressionReturn")).toBe(true);
    expect(stepRegistry.get("ExpressionReturn")?.category).toBe("transform");
  });

  it("should have correct static properties", () => {
    expect(ExpressionReturnStep.stepName).toBe("ExpressionReturn");
    expect(ExpressionReturnStep.category).toBe("transform");
  });

  it("should create instance with items", () => {
    const items = [{ expression: { type: "variableRef", variable: "n" } as const, alias: "node" }];
    const step = new ExpressionReturnStep({ items });
    expect(step).toBeInstanceOf(ExpressionReturnStep);
    expect(step.name).toBe("ExpressionReturn");
    expect(step.config.items).toHaveLength(1);
  });

  it("should round-trip through JSON", () => {
    const items = [{ expression: { type: "variableRef", variable: "n" } }];
    const original = new ExpressionReturnStep({ items, stepLabels: ["er"] });
    const json = original.toJSON();
    const restored = ExpressionReturnStep.fromJSON(json);
    expect(restored).toBeInstanceOf(ExpressionReturnStep);
    expect(restored?.config.items).toHaveLength(1);
    expect(restored?.config.stepLabels).toEqual(["er"]);
  });

  it("should return null for invalid JSON", () => {
    expect(ExpressionReturnStep.fromJSON(null)).toBeNull();
    expect(ExpressionReturnStep.fromJSON(["ExpressionReturn", {}])).toBeNull();
    expect(ExpressionReturnStep.fromJSON(["ExpressionReturn", { items: "invalid" }])).toBeNull();
  });

  it("should clone with partial config", () => {
    const items = [{ expression: { type: "variableRef", variable: "a" } as const }];
    const newItems = [{ expression: { type: "variableRef", variable: "b" } as const }];
    const step = new ExpressionReturnStep({ items, stepLabels: ["er"] });
    const cloned = step.clone({ items: newItems });
    expect(cloned).toBeInstanceOf(ExpressionReturnStep);
    expect(cloned.config.items).toEqual(newItems);
    expect(cloned.config.stepLabels).toEqual(["er"]);
  });
});

describe("Transform steps registry integration", () => {
  it("should create all transform steps via registry", () => {
    // Note: MapElementsStep has special handling - can't be created via registry
    // because it requires a function mapper

    const values = stepRegistry.create("Values", {});
    expect(values).toBeInstanceOf(ValuesStep);

    const propertyValues = stepRegistry.create("PropertyValues", { items: [] });
    expect(propertyValues).toBeInstanceOf(PropertyValuesStep);

    const labels = stepRegistry.create("Labels", {});
    expect(labels).toBeInstanceOf(LabelsStep);

    const select = stepRegistry.create("Select", { pathLabels: [] });
    expect(select).toBeInstanceOf(SelectStep);

    const unfold = stepRegistry.create("Unfold", {});
    expect(unfold).toBeInstanceOf(UnfoldStep);

    const bindPath = stepRegistry.create("BindPath", { pathVariable: "p" });
    expect(bindPath).toBeInstanceOf(BindPathStep);

    const call = stepRegistry.create("Call", { procedureName: "test", arguments: [] });
    expect(call).toBeInstanceOf(CallStep);

    const exprReturn = stepRegistry.create("ExpressionReturn", { items: [] });
    expect(exprReturn).toBeInstanceOf(ExpressionReturnStep);
  });

  it("should list all transform steps by category", () => {
    const transformSteps = [
      "MapElements",
      "Values",
      "PropertyValues",
      "Labels",
      "Select",
      "Unfold",
      "BindPath",
      "Call",
      "ExpressionReturn",
    ];
    for (const name of transformSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("transform");
    }
  });
});
