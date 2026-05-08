import { describe, it, expect } from "vitest";
import { CreateStep, SetStep, DeleteStep, RemoveStep, MergeStep } from "../index.js";
import { stepRegistry } from "../../StepRegistry.js";
import type { CreateVertexConfig, SetAssignment, RemoveItem } from "../../../Steps.js";

describe("CreateStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Create")).toBe(true);
    expect(stepRegistry.get("Create")?.category).toBe("mutation");
  });

  it("should have correct static properties", () => {
    expect(CreateStep.stepName).toBe("Create");
    expect(CreateStep.category).toBe("mutation");
  });

  it("should create instance with vertices", () => {
    const vertices: CreateVertexConfig[] = [
      { variable: "n", label: "Person", properties: { name: "Alice" } },
    ];
    const step = new CreateStep({ vertices });
    expect(step).toBeInstanceOf(CreateStep);
    expect(step.name).toBe("Create");
    expect(step.config.vertices).toHaveLength(1);
  });

  it("should deserialize from JSON", () => {
    const vertices: CreateVertexConfig[] = [{ variable: "n", label: "Person", properties: {} }];
    const step = CreateStep.fromJSON(["Create", { vertices }]);
    expect(step).toBeInstanceOf(CreateStep);
    expect(step?.config.vertices).toHaveLength(1);
  });

  it("should return null for invalid JSON", () => {
    expect(CreateStep.fromJSON(null)).toBeNull();
    expect(CreateStep.fromJSON(["WrongName", {}])).toBeNull();
    expect(CreateStep.fromJSON(["Create", {}])).toBeNull();
  });

  it("should clone with partial config", () => {
    const vertices: CreateVertexConfig[] = [{ variable: "n", label: "Person", properties: {} }];
    const step = new CreateStep({ vertices, stepLabels: ["c"] });
    const newVertices: CreateVertexConfig[] = [{ variable: "m", label: "Company", properties: {} }];
    const cloned = step.clone({ vertices: newVertices });
    expect(cloned).toBeInstanceOf(CreateStep);
    expect(cloned.config.vertices).toEqual(newVertices);
    expect(cloned.config.stepLabels).toEqual(["c"]);
  });
});

describe("SetStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Set")).toBe(true);
    expect(stepRegistry.get("Set")?.category).toBe("mutation");
  });

  it("should create instance with assignments", () => {
    const assignments: SetAssignment[] = [{ variable: "n", property: "name", value: "Bob" }];
    const step = new SetStep({ assignments });
    expect(step).toBeInstanceOf(SetStep);
    expect(step.name).toBe("Set");
    expect(step.config.assignments).toHaveLength(1);
  });

  it("should round-trip through JSON", () => {
    const assignments: SetAssignment[] = [{ variable: "n", property: "age", value: 30 }];
    const original = new SetStep({ assignments, stepLabels: ["s"] });
    const json = original.toJSON();
    const restored = SetStep.fromJSON(json);
    expect(restored).toBeInstanceOf(SetStep);
    expect(restored?.config.assignments).toHaveLength(1);
    expect(restored?.config.stepLabels).toEqual(["s"]);
  });
});

describe("DeleteStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Delete")).toBe(true);
    expect(stepRegistry.get("Delete")?.category).toBe("mutation");
  });

  it("should create instance with variables", () => {
    const step = new DeleteStep({ variables: ["n", "r"], detach: true });
    expect(step).toBeInstanceOf(DeleteStep);
    expect(step.name).toBe("Delete");
    expect(step.config.variables).toEqual(["n", "r"]);
    expect(step.config.detach).toBe(true);
  });

  it("should round-trip through JSON", () => {
    const original = new DeleteStep({ variables: ["n"], detach: false });
    const json = original.toJSON();
    const restored = DeleteStep.fromJSON(json);
    expect(restored).toBeInstanceOf(DeleteStep);
    expect(restored?.config.variables).toEqual(["n"]);
    expect(restored?.config.detach).toBe(false);
  });

  it("should return null for missing variables", () => {
    expect(DeleteStep.fromJSON(["Delete", {}])).toBeNull();
  });
});

describe("RemoveStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Remove")).toBe(true);
    expect(stepRegistry.get("Remove")?.category).toBe("mutation");
  });

  it("should create instance with items", () => {
    const items: RemoveItem[] = [{ variable: "n", property: "oldField" }];
    const step = new RemoveStep({ items });
    expect(step).toBeInstanceOf(RemoveStep);
    expect(step.name).toBe("Remove");
    expect(step.config.items).toHaveLength(1);
  });

  it("should round-trip through JSON", () => {
    const items: RemoveItem[] = [
      { variable: "n", property: "temp" },
      { variable: "r", label: "OLD_LABEL" },
    ];
    const original = new RemoveStep({ items });
    const json = original.toJSON();
    const restored = RemoveStep.fromJSON(json);
    expect(restored).toBeInstanceOf(RemoveStep);
    expect(restored?.config.items).toHaveLength(2);
  });

  it("should return null for missing items", () => {
    expect(RemoveStep.fromJSON(["Remove", {}])).toBeNull();
  });
});

describe("MergeStep (modular)", () => {
  it("should be registered with stepRegistry", () => {
    expect(stepRegistry.has("Merge")).toBe(true);
    expect(stepRegistry.get("Merge")?.category).toBe("mutation");
  });

  it("should create instance with pattern", () => {
    const step = new MergeStep({
      pattern: { variable: "n", label: "Person", properties: { id: "123" } },
    });
    expect(step).toBeInstanceOf(MergeStep);
    expect(step.name).toBe("Merge");
    expect(step.config.pattern.variable).toBe("n");
  });

  it("should create instance with onCreate and onMatch", () => {
    const onCreate: SetAssignment[] = [{ variable: "n", property: "created", value: true }];
    const onMatch: SetAssignment[] = [{ variable: "n", property: "updated", value: true }];
    const step = new MergeStep({
      pattern: { variable: "n", label: "Person", properties: { id: "123" } },
      onCreate,
      onMatch,
    });
    expect(step.config.onCreate).toHaveLength(1);
    expect(step.config.onMatch).toHaveLength(1);
  });

  it("should round-trip through JSON", () => {
    const original = new MergeStep({
      pattern: { variable: "n", label: "User", properties: { email: "test@example.com" } },
      stepLabels: ["merged"],
    });
    const json = original.toJSON();
    const restored = MergeStep.fromJSON(json);
    expect(restored).toBeInstanceOf(MergeStep);
    expect(restored?.config.pattern.variable).toBe("n");
    expect(restored?.config.stepLabels).toEqual(["merged"]);
  });

  it("should return null for missing pattern", () => {
    expect(MergeStep.fromJSON(["Merge", {}])).toBeNull();
  });
});

describe("Mutation steps registry integration", () => {
  it("should create all mutation steps via registry", () => {
    const create = stepRegistry.create("Create", { vertices: [] });
    expect(create).toBeInstanceOf(CreateStep);

    const set = stepRegistry.create("Set", { assignments: [] });
    expect(set).toBeInstanceOf(SetStep);

    const del = stepRegistry.create("Delete", { variables: ["n"] });
    expect(del).toBeInstanceOf(DeleteStep);

    const remove = stepRegistry.create("Remove", { items: [] });
    expect(remove).toBeInstanceOf(RemoveStep);

    const merge = stepRegistry.create("Merge", { pattern: { variable: "n", label: "Test" } });
    expect(merge).toBeInstanceOf(MergeStep);
  });

  it("should list all mutation steps by category", () => {
    const mutationSteps = ["Create", "Set", "Delete", "Remove", "Merge"];
    for (const name of mutationSteps) {
      expect(stepRegistry.has(name)).toBe(true);
      expect(stepRegistry.get(name)?.category).toBe("mutation");
    }
  });
});
