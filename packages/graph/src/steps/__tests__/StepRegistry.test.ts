import { describe, it, expect, beforeEach } from "vitest";
import {
  StepRegistry,
  stepRegistry,
  isKnownStep,
  createStepFromJSON,
  type StepDefinition,
  type StepCategory,
} from "../StepRegistry.js";
import { Step, type StepConfig } from "../base.js";
import type { GraphSource } from "../../Graph.js";
import type { QueryContext } from "../../QueryContext.js";

// Test step implementations
interface TestStepConfig extends StepConfig {
  value?: string;
}

class TestStep extends Step<TestStepConfig> {
  static readonly stepName = "Test";
  static readonly category = "other" as StepCategory;

  get name(): string {
    return "Test";
  }

  *traverse(
    _source: GraphSource<any>,
    input: Iterable<unknown>,
    _context: QueryContext,
  ): IterableIterator<unknown> {
    for (const item of input) {
      this.traversed++;
      this.emitted++;
      yield item;
    }
  }

  clone(partial?: Partial<TestStepConfig>): Step<TestStepConfig> {
    return new TestStep({
      ...this.config,
      ...partial,
      stepLabels:
        partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
    });
  }

  static fromJSON(json: unknown): TestStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Test") return null;
    return new TestStep(config as TestStepConfig);
  }
}

class AnotherStep extends Step<{ prefix: string } & StepConfig> {
  static readonly stepName = "Another";
  static readonly category = "fetch" as StepCategory;

  get name(): string {
    return "Another";
  }

  *traverse(
    _source: GraphSource<any>,
    input: Iterable<unknown>,
    _context: QueryContext,
  ): IterableIterator<unknown> {
    for (const item of input) {
      yield item;
    }
  }

  clone(partial?: Partial<{ prefix: string } & StepConfig>): Step<{ prefix: string } & StepConfig> {
    return new AnotherStep({
      ...this.config,
      ...partial,
      stepLabels:
        partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
    });
  }

  static fromJSON(json: unknown): AnotherStep | null {
    if (!Array.isArray(json) || json.length < 2) return null;
    const [name, config] = json;
    if (name !== "Another") return null;
    return new AnotherStep(config as { prefix: string } & StepConfig);
  }
}

describe("StepRegistry", () => {
  let registry: StepRegistry;

  beforeEach(() => {
    registry = new StepRegistry();
  });

  describe("registration", () => {
    it("should register a step definition", () => {
      const def: StepDefinition = {
        name: "Test",
        category: "other",
        constructor: TestStep as any,
      };

      registry.register(def);

      expect(registry.has("Test")).toBe(true);
      expect(registry.size).toBe(1);
    });

    it("should throw when registering duplicate step names", () => {
      const def: StepDefinition = {
        name: "Test",
        category: "other",
        constructor: TestStep as any,
      };

      registry.register(def);

      expect(() => registry.register(def)).toThrow('Step "Test" is already registered');
    });

    it("should allow multiple steps with different names", () => {
      registry.register({
        name: "Test",
        category: "other",
        constructor: TestStep as any,
      });

      registry.register({
        name: "Another",
        category: "fetch",
        constructor: AnotherStep as any,
      });

      expect(registry.size).toBe(2);
      expect(registry.has("Test")).toBe(true);
      expect(registry.has("Another")).toBe(true);
    });
  });

  describe("lookup", () => {
    it("should get a step definition by name", () => {
      const def: StepDefinition = {
        name: "Test",
        category: "other",
        constructor: TestStep as any,
      };
      registry.register(def);

      const found = registry.get("Test");

      expect(found).toBeDefined();
      expect(found?.name).toBe("Test");
      expect(found?.category).toBe("other");
    });

    it("should return undefined for unknown steps", () => {
      const found = registry.get("NonExistent");
      expect(found).toBeUndefined();
    });

    it("should return all step names sorted", () => {
      registry.register({ name: "Zebra", category: "other", constructor: TestStep as any });
      registry.register({ name: "Apple", category: "other", constructor: TestStep as any });
      registry.register({ name: "Mango", category: "other", constructor: TestStep as any });

      const names = registry.stepNames();

      expect(names).toEqual(["Apple", "Mango", "Zebra"]);
    });
  });

  describe("create", () => {
    it("should create a step instance", () => {
      registry.register({
        name: "Test",
        category: "other",
        constructor: TestStep as any,
      });

      const step = registry.create("Test", { value: "hello" });

      expect(step).toBeInstanceOf(TestStep);
      expect(step.name).toBe("Test");
      expect(step.config.value).toBe("hello");
    });

    it("should throw for unknown step names", () => {
      expect(() => registry.create("NonExistent", {})).toThrow("Unknown step: NonExistent");
    });
  });

  describe("fromJSON", () => {
    it("should deserialize a step from JSON", () => {
      registry.register({
        name: "Test",
        category: "other",
        constructor: TestStep as any,
      });

      const json = ["Test", { value: "test-value" }];
      const step = registry.fromJSON(json);

      expect(step).toBeInstanceOf(TestStep);
      expect(step?.config.value).toBe("test-value");
    });

    it("should return null for invalid JSON", () => {
      registry.register({
        name: "Test",
        category: "other",
        constructor: TestStep as any,
      });

      expect(registry.fromJSON(null)).toBeNull();
      expect(registry.fromJSON("string")).toBeNull();
      expect(registry.fromJSON({})).toBeNull();
      expect(registry.fromJSON([])).toBeNull(); // Empty array - no name/config
    });

    it("should return null for unknown step names in JSON", () => {
      const json = ["UnknownStep", {}];
      expect(registry.fromJSON(json)).toBeNull();
    });
  });

  describe("categories", () => {
    it("should return all unique categories", () => {
      registry.register({ name: "A", category: "fetch", constructor: TestStep as any });
      registry.register({ name: "B", category: "fetch", constructor: TestStep as any });
      registry.register({ name: "C", category: "traversal", constructor: TestStep as any });
      registry.register({ name: "D", category: "filter", constructor: TestStep as any });

      const categories = registry.categories();

      expect(categories).toContain("fetch");
      expect(categories).toContain("traversal");
      expect(categories).toContain("filter");
      expect(categories).toHaveLength(3);
    });

    it("should return steps in a specific category", () => {
      registry.register({ name: "A", category: "fetch", constructor: TestStep as any });
      registry.register({ name: "B", category: "fetch", constructor: TestStep as any });
      registry.register({ name: "C", category: "traversal", constructor: TestStep as any });

      const fetchSteps = registry.stepsInCategory("fetch");

      expect(fetchSteps).toHaveLength(2);
      expect(fetchSteps.map((d) => d.name)).toContain("A");
      expect(fetchSteps.map((d) => d.name)).toContain("B");
    });
  });
});

describe("global stepRegistry", () => {
  // Note: These tests rely on the global registry state
  // In practice, the global registry would be populated at module load time

  it("should be available as a singleton", () => {
    expect(stepRegistry).toBeDefined();
    expect(stepRegistry).toBeInstanceOf(StepRegistry);
  });

  it("should initially be empty", () => {
    // The global registry starts empty until steps register themselves
    expect(stepRegistry.size).toBe(0);
  });
});

describe("isKnownStep", () => {
  it("should return false for unregistered steps", () => {
    expect(isKnownStep("FakeStep")).toBe(false);
  });

  it("should return true for registered steps", () => {
    // Register temporarily for this test
    stepRegistry.register({
      name: "TempStep",
      category: "other",
      constructor: TestStep as any,
    });

    expect(isKnownStep("TempStep")).toBe(true);
  });
});

describe("createStepFromJSON", () => {
  it("should return null for invalid input", () => {
    expect(createStepFromJSON(null)).toBeNull();
    expect(createStepFromJSON("invalid")).toBeNull();
  });
});
