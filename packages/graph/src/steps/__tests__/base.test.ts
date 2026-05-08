import { describe, it, expect } from "vitest";
import {
  Step,
  ContainerStep,
  Traverser,
  createTraverser,
  stringifySteps,
  type StepConfig,
} from "../../Steps.js";
import type { GraphSource } from "../../Graph.js";
import type { QueryContext } from "../../QueryContext.js";

// Mock GraphSource for testing
const mockGraphSource = {} as GraphSource<any>;
const mockQueryContext = { params: {} } as QueryContext;

// Test step implementations
class TestStep extends Step<{ value: string } & StepConfig> {
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

  clone(partial?: Partial<{ value: string } & StepConfig>): Step<{ value: string } & StepConfig> {
    return new TestStep({
      ...this.config,
      ...partial,
      stepLabels:
        partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
    });
  }
}

class DoubleStep extends Step<StepConfig> {
  get name(): string {
    return "Double";
  }

  *traverse(
    _source: GraphSource<any>,
    input: Iterable<unknown>,
    _context: QueryContext,
  ): IterableIterator<unknown> {
    for (const item of input) {
      if (typeof item === "number") {
        this.traversed++;
        this.emitted++;
        yield item * 2;
      }
    }
  }

  clone(partial?: Partial<StepConfig>): Step<StepConfig> {
    return new DoubleStep({
      ...this.config,
      ...partial,
      stepLabels:
        partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
    });
  }
}

class TestContainerStep extends ContainerStep<readonly Step<any>[], StepConfig> {
  get name(): string {
    return "TestContainer";
  }

  *traverse(
    source: GraphSource<any>,
    input: Iterable<unknown>,
    context: QueryContext,
  ): IterableIterator<unknown> {
    // Container steps typically execute nested steps in some way
    for (const step of this.steps) {
      input = step.traverse(source, input, context);
    }
    yield* input;
  }

  clone(partial?: Partial<StepConfig>): Step<StepConfig> {
    return new TestContainerStep(
      {
        ...this.config,
        ...partial,
        stepLabels:
          partial?.stepLabels ?? (this.config.stepLabels ? [...this.config.stepLabels] : undefined),
      },
      this.steps,
    );
  }
}

describe("Step", () => {
  describe("basic properties", () => {
    it("should have a name", () => {
      const step = new TestStep({ value: "test" });
      expect(step.name).toBe("Test");
    });

    it("should store config", () => {
      const step = new TestStep({ value: "hello", stepLabels: ["a"] });
      expect(step.config.value).toBe("hello");
      expect(step.config.stepLabels).toEqual(["a"]);
    });

    it("should track traversed and emitted counts", () => {
      const step = new TestStep({ value: "test" });
      expect(step.traversed).toBe(0);
      expect(step.emitted).toBe(0);

      const result = [...step.traverse(mockGraphSource, [1, 2, 3], mockQueryContext)];

      expect(step.traversed).toBe(3);
      expect(step.emitted).toBe(3);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("clone", () => {
    it("should create a copy with same config", () => {
      const step = new TestStep({ value: "original", stepLabels: ["x"] });
      const cloned = step.clone();

      expect(cloned).not.toBe(step);
      expect(cloned.config.value).toBe("original");
      expect(cloned.config.stepLabels).toEqual(["x"]);
    });

    it("should allow overriding config in clone", () => {
      const step = new TestStep({ value: "original" });
      const cloned = step.clone({ value: "modified" });

      expect(cloned.config.value).toBe("modified");
    });
  });

  describe("withLabel", () => {
    it("should add a label to the step", () => {
      const step = new TestStep({ value: "test" });
      const labeled = step.withLabel("myLabel");

      expect(labeled.config.stepLabels).toEqual(["myLabel"]);
    });

    it("should preserve existing labels", () => {
      const step = new TestStep({ value: "test", stepLabels: ["existing"] });
      const labeled = step.withLabel("new");

      expect(labeled.config.stepLabels).toEqual(["existing", "new"]);
    });
  });

  describe("toString", () => {
    it("should produce string representation", () => {
      const step = new TestStep({ value: "test" });
      const str = step.toString();

      expect(str).toContain("Test");
      expect(str).toContain("value");
    });

    it("should include stats when traversed", () => {
      const step = new TestStep({ value: "test" });
      const _results = [...step.traverse(mockGraphSource, [1, 2, 3], mockQueryContext)];

      const str = step.toString();
      expect(str).toContain("traversed");
      expect(str).toContain("3");
    });
  });

  describe("toJSON", () => {
    it("should serialize to JSON format", () => {
      const step = new TestStep({ value: "test" });
      const json = step.toJSON();

      expect(json).toEqual(["Test", { value: "test" }]);
    });
  });
});

describe("ContainerStep", () => {
  it("should store nested steps", () => {
    const inner = new TestStep({ value: "inner" });
    const container = new TestContainerStep({}, [inner]);

    expect(container.steps).toHaveLength(1);
    expect(container.steps[0]).toBe(inner);
  });

  it("should include nested steps in toJSON", () => {
    const inner = new TestStep({ value: "inner" });
    const container = new TestContainerStep({}, [inner]);

    const json = container.toJSON();
    expect(json[0]).toBe("TestContainer");
    expect(json[2]).toHaveLength(1);
  });
});

describe("Traverser", () => {
  describe("single step", () => {
    it("should traverse a single step", () => {
      const step = new TestStep({ value: "test" });
      const traverser = new Traverser(step);

      const result = [...traverser.traverse(mockGraphSource, [1, 2, 3], mockQueryContext)];
      expect(result).toEqual([1, 2, 3]);
    });

    it("should track step statistics", () => {
      const step = new TestStep({ value: "test" });
      const traverser = new Traverser(step);

      const _results = [...traverser.traverse(mockGraphSource, [1, 2], mockQueryContext)];
      expect(step.traversed).toBe(2);
    });
  });

  describe("chained steps", () => {
    it("should chain multiple steps", () => {
      const step1 = new TestStep({ value: "first" });
      const step2 = new DoubleStep({});

      const t1 = new Traverser(step1);
      const t2 = new Traverser(step2);
      t1.next = t2;
      t2.previous = t1;

      const result = [...t1.traverse(mockGraphSource, [1, 2, 3], mockQueryContext)];
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("matches", () => {
    it("should return true when step emits values", () => {
      const step = new TestStep({ value: "test" });
      const traverser = new Traverser(step);

      expect(traverser.matches(mockGraphSource, [1], mockQueryContext)).toBe(true);
    });

    it("should return false when step emits nothing", () => {
      const step = new DoubleStep({});
      const traverser = new Traverser(step);

      // DoubleStep filters non-numbers, so strings yield nothing
      expect(traverser.matches(mockGraphSource, ["not-a-number"], mockQueryContext)).toBe(false);
    });
  });

  describe("createTraverser", () => {
    it("should create a traverser from a single step", () => {
      const step = new TestStep({ value: "test" });
      const head = createTraverser([step]);

      // Traverser doesn't expose step directly - test via behavior
      expect(head.next).toBeUndefined();
    });

    it("should link multiple steps", () => {
      const step1 = new TestStep({ value: "first" });
      const step2 = new DoubleStep({});

      const head = createTraverser([step1, step2]);

      // Test linking via traversal behavior, not step accessor
      expect(head.next).toBeDefined();
      expect(head.next?.previous).toBe(head);
    });

    it("should throw for empty step array", () => {
      expect(() => createTraverser([])).toThrow("At least one step is required");
    });

    it("should execute pipeline correctly", () => {
      const step1 = new TestStep({ value: "first" });
      const step2 = new DoubleStep({});

      const head = createTraverser([step1, step2]);
      const result = [...head.traverse(mockGraphSource, [1, 2, 3], mockQueryContext)];

      expect(result).toEqual([2, 4, 6]);
    });
  });
});

describe("stringifySteps", () => {
  it("should convert steps to string", () => {
    const step = new TestStep({ value: "test" });
    const str = stringifySteps([step]);

    expect(str).toContain("Test");
  });

  it("should handle multiple steps", () => {
    const step1 = new TestStep({ value: "first" });
    const step2 = new DoubleStep({});

    const str = stringifySteps([step1, step2]);

    expect(str).toContain("Test");
    expect(str).toContain("Double");
  });
});
