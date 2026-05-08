import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  resolveConditionValue,
  stringifyCondition,
  stringifyConditionValueRef,
  type Condition,
  type ConditionValue,
  type BinaryCondition,
  type LogicalCondition,
  type UnaryCondition,
} from "../../Steps.js";
import { TraversalPath } from "../../Traversals.js";
import type { QueryContext } from "../../QueryContext.js";
import { Vertex, Edge, $StoredElement, type StoredElement } from "../../Graph.js";

// Mock data setup
const mockContext: QueryContext = {
  params: { name: "Alice", age: 30 },
} as QueryContext;

// Helper to create a stored element structure
function createStoredElement<TProps>(
  id: string,
  properties: TProps,
): StoredElement & { properties: TProps } {
  return {
    id,
    label: id.split(":")[0] || "Test",
    properties: properties as unknown as Record<string, unknown>,
    inVertices: [],
    outVertices: [],
  } as unknown as StoredElement & { properties: TProps };
}

// Create a mock Vertex-like object for testing
function createMockVertex(props: { name: string; age: number }) {
  const stored = createStoredElement("Person:test-uuid", props);
  // Create a minimal object that satisfies the Vertex interface
  const mockVertex = {
    [$StoredElement]: stored,
    id: stored.id,
    label: "Person",
    uuid: "test-uuid",
    graph: undefined as any,
    hasLabel: () => true,
    hasProperty: (key: string) => props[key as keyof typeof props] !== undefined,
    get: <K extends keyof typeof props>(key: K) => props[key],
    set: () => {},
    toString: () => stored.id,
    toJSON: () => ({ id: stored.id, label: "Person", properties: props }),
  };
  // Mark it as Vertex-like for instanceof checks
  Object.setPrototypeOf(mockVertex, Vertex.prototype);
  return mockVertex as unknown as Vertex<"Person", typeof props>;
}

// Helper to create a path with a vertex
function createVertexPath(props: { name: string; age: number }): TraversalPath<any, any, any> {
  const vertex = createMockVertex(props);
  return new TraversalPath(undefined, vertex, ["n"]);
}

describe("evaluateCondition", () => {
  describe("binary conditions", () => {
    it("should evaluate = operator", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: BinaryCondition = ["=", "name", "Alice"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate != operator", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: BinaryCondition = ["!=", "name", "Bob"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate < operator", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: BinaryCondition = ["<", "age", 40];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate > operator", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: BinaryCondition = [">", "age", 20];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate =~ (regex) operator", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: BinaryCondition = ["=~", "name", "Ali.*"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate startsWith operator", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: BinaryCondition = ["startsWith", "name", "Ali"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate contains operator", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: BinaryCondition = ["contains", "name", "lic"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });
  });

  describe("logical conditions", () => {
    it("should evaluate AND conditions", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: LogicalCondition = ["and", ["=", "name", "Alice"], [">", "age", 25]];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate OR conditions", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: LogicalCondition = ["or", ["=", "name", "Bob"], ["=", "age", 30]];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate NOT conditions", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: Condition = ["not", ["=", "name", "Bob"]];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate XOR conditions (exactly one true)", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: LogicalCondition = [
        "xor",
        ["=", "name", "Alice"], // true
        ["=", "age", 25], // false
      ];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });
  });

  describe("unary conditions", () => {
    it("should evaluate exists condition", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: UnaryCondition = ["exists", "name"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate isNull condition", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: UnaryCondition = ["isNull", "nickname"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should evaluate isNotNull condition", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: UnaryCondition = ["isNotNull", "name"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });
  });

  describe("IN condition", () => {
    it("should check if value is in array", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: Condition = ["in", "name", ["Alice", "Bob", "Charlie"]];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should return false if value is not in array", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: Condition = ["in", "name", ["Bob", "Charlie"]];

      expect(evaluateCondition(path, condition, mockContext)).toBe(false);
    });
  });

  describe("expression conditions", () => {
    it("should evaluate expression with parameter refs", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: Condition = [
        "expr",
        "=",
        { type: "propertyRef", variable: "n", property: "name" },
        { type: "parameterRef", name: "name" },
      ];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for non-Vertex/Edge values", () => {
      const path = new TraversalPath(undefined, "not-a-vertex", []);
      const condition: BinaryCondition = ["=", "name", "Alice"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(false);
    });

    it("should handle empty AND condition as true", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: LogicalCondition = ["and"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(true);
    });

    it("should handle empty OR condition as false", () => {
      const path = createVertexPath({ name: "Alice", age: 30 });
      const condition: LogicalCondition = ["or"];

      expect(evaluateCondition(path, condition, mockContext)).toBe(false);
    });
  });
});

describe("resolveConditionValue", () => {
  it("should return literals unchanged", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });

    expect(resolveConditionValue(path, "string", mockContext)).toBe("string");
    expect(resolveConditionValue(path, 42, mockContext)).toBe(42);
    expect(resolveConditionValue(path, true, mockContext)).toBe(true);
    expect(resolveConditionValue(path, null, mockContext)).toBe(null);
  });

  it("should resolve null type to null", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = { type: "null" };

    expect(resolveConditionValue(path, value, mockContext)).toBe(null);
  });

  it("should resolve parameter references", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = { type: "parameterRef", name: "name" };

    expect(resolveConditionValue(path, value, mockContext)).toBe("Alice");
  });

  it("should resolve property references", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = { type: "propertyRef", variable: "n", property: "name" };

    expect(resolveConditionValue(path, value, mockContext)).toBe("Alice");
  });

  it("should resolve variable references", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = { type: "variableRef", variable: "n" };

    expect(resolveConditionValue(path, value, mockContext)).toBeInstanceOf(Vertex);
  });

  it("should handle arithmetic expressions", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = {
      type: "arithmeticExpression",
      operator: "+",
      left: 10,
      right: 5,
    };

    expect(resolveConditionValue(path, value, mockContext)).toBe(15);
  });

  it("should handle string concatenation", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = {
      type: "arithmeticExpression",
      operator: "+",
      left: "Hello, ",
      right: "World",
    };

    expect(resolveConditionValue(path, value, mockContext)).toBe("Hello, World");
  });

  it("should handle list concatenation", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = {
      type: "arithmeticExpression",
      operator: "+",
      left: [1, 2],
      right: [3, 4],
    };

    expect(resolveConditionValue(path, value, mockContext)).toEqual([1, 2, 3, 4]);
  });

  it("should handle list literal", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = {
      type: "listLiteral",
      values: [1, 2, { type: "parameterRef", name: "age" }],
    };

    expect(resolveConditionValue(path, value, mockContext)).toEqual([1, 2, 30]);
  });

  it("should handle map literal", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = {
      type: "mapLiteral",
      entries: [
        { key: "name", value: { type: "parameterRef", name: "name" } },
        { key: "age", value: 30 },
      ],
    };

    expect(resolveConditionValue(path, value, mockContext)).toEqual({ name: "Alice", age: 30 });
  });

  it("should handle list index expression", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = {
      type: "listIndexExpression",
      list: { type: "listLiteral", values: ["a", "b", "c"] },
      index: 1,
    };

    expect(resolveConditionValue(path, value, mockContext)).toBe("b");
  });

  it("should handle slice expression", () => {
    const path = createVertexPath({ name: "Alice", age: 30 });
    const value: ConditionValue = {
      type: "sliceExpression",
      list: { type: "listLiteral", values: ["a", "b", "c", "d"] },
      start: 1,
      end: 3,
    };

    expect(resolveConditionValue(path, value, mockContext)).toEqual(["b", "c"]);
  });
});

// Helper to strip ANSI codes for testing stringified output
function stripAnsi(str: string): string {
  return str.replace(/\[\d+m/g, "");
}

describe("stringifyCondition", () => {
  it("should stringify binary conditions", () => {
    const condition: BinaryCondition = ["=", "name", "Alice"];
    expect(stripAnsi(stringifyCondition(condition))).toBe('name = "Alice"');
  });

  it("should stringify logical AND", () => {
    const condition: LogicalCondition = ["and", ["=", "name", "Alice"], [">", "age", 25]];
    expect(stripAnsi(stringifyCondition(condition))).toBe('(name = "Alice" and age > 25)');
  });

  it("should stringify NOT", () => {
    const condition: Condition = ["not", ["=", "name", "Bob"]];
    expect(stripAnsi(stringifyCondition(condition))).toBe('not name = "Bob"');
  });

  it("should stringify EXISTS", () => {
    const condition: UnaryCondition = ["exists", "name"];
    expect(stripAnsi(stringifyCondition(condition))).toBe("name exists");
  });

  it("should stringify IN", () => {
    const condition: Condition = ["in", "name", ["Alice", "Bob"]];
    expect(stripAnsi(stringifyCondition(condition))).toBe('name in ["Alice","Bob"]');
  });
});

describe("stringifyConditionValueRef", () => {
  it("should stringify literals", () => {
    expect(stripAnsi(stringifyConditionValueRef("hello"))).toBe('"hello"');
    expect(stripAnsi(stringifyConditionValueRef(42))).toBe("42");
    expect(stripAnsi(stringifyConditionValueRef(null))).toBe("null");
  });

  it("should stringify variable refs", () => {
    expect(stripAnsi(stringifyConditionValueRef({ type: "variableRef", variable: "n" }))).toBe("n");
  });

  it("should stringify property refs", () => {
    expect(
      stripAnsi(
        stringifyConditionValueRef({ type: "propertyRef", variable: "n", property: "name" }),
      ),
    ).toBe("n.name");
  });

  it("should stringify parameter refs", () => {
    expect(stripAnsi(stringifyConditionValueRef({ type: "parameterRef", name: "age" }))).toBe(
      "$age",
    );
  });

  it("should stringify arithmetic expressions", () => {
    const value: ConditionValue = {
      type: "arithmeticExpression",
      operator: "+",
      left: 10,
      right: 5,
    };
    expect(stripAnsi(stringifyConditionValueRef(value))).toBe("(10 + 5)");
  });
});
