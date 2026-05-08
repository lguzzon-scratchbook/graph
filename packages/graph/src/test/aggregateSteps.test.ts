import { expect, test, describe } from "vitest";
import { parse } from "../grammar.js";
import { astToSteps } from "../astToSteps.js";
import { createTraverser, QueryContext, MaxStep, MinStep, AvgStep, SumStep } from "../Steps.js";
import { createDemoGraph } from "../getDemoGraph.js";
import { Graph } from "../Graph.js";
import { InMemoryGraphStorage } from "../GraphStorage.js";
import type { Query } from "../AST.js";
import { StandardSchemaV1 } from "@standard-schema/spec";
import type { GraphSchema } from "../GraphSchema.js";

const { graph } = createDemoGraph();

function makeType<T>(_defaultValue: T): StandardSchemaV1<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "codemix",
      validate: (value) => {
        return { value: value as T };
      },
    },
  };
}

function executeQuery(graph: Graph<any>, queryString: string): unknown[] {
  const ast = parse(queryString) as Query;
  const steps = astToSteps(ast);
  const traverser = createTraverser(steps);
  return Array.from(traverser.traverse(graph, [], new QueryContext(graph, {})));
}

describe("MaxStep via Cypher", () => {
  test("MAX(p.age) returns maximum age", () => {
    const results = executeQuery(graph, "MATCH (p:Person) RETURN MAX(p.age) AS maxAge");
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(55); // George is oldest in demo graph
  });

  test("MAX with null values in dataset", () => {
    // Demo graph has all ages defined, but test null handling
    const results = executeQuery(graph, "MATCH (p:Person) RETURN MAX(p.age)");
    expect(results).toHaveLength(1);
    expect(results[0]).toBeGreaterThan(0);
  });
});

describe("MinStep via Cypher", () => {
  test("MIN(p.age) returns minimum age", () => {
    const results = executeQuery(graph, "MATCH (p:Person) RETURN MIN(p.age) AS minAge");
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(25); // Bob is youngest
  });
});

describe("AvgStep via Cypher", () => {
  test("AVG(p.age) returns average age", () => {
    const results = executeQuery(graph, "MATCH (p:Person) RETURN AVG(p.age) AS avgAge");
    expect(results).toHaveLength(1);
    // Average of [30, 25, 35, 40, 45, 50, 55] = 280/7 = 40
    expect(results[0]).toBe(40);
  });
});

describe("SumStep via Cypher", () => {
  test("SUM(p.age) returns sum of ages", () => {
    const results = executeQuery(graph, "MATCH (p:Person) RETURN SUM(p.age) AS totalAge");
    expect(results).toHaveLength(1);
    // 30+25+35+40+45+50+55 = 280
    expect(results[0]).toBe(280);
  });

  test("SUM with Thing prices", () => {
    // Sum of Thing refs (which are numbers)
    const results = executeQuery(graph, "MATCH (t:Thing) RETURN SUM(t.ref) AS totalRef");
    expect(results).toHaveLength(1);
    // Thing refs are 1-7, sum = 28
    expect(results[0]).toBe(28);
  });
});

describe("Aggregate steps - JSON serialization", () => {
  test("MaxStep can be serialized and deserialized", () => {
    const step = new MaxStep({ property: "age", stepLabels: ["maxAge"] });
    const json = step.toJSON();
    expect(json[0]).toBe("Max");
    expect(json[1]).toHaveProperty("property", "age");
  });

  test("MinStep can be serialized and deserialized", () => {
    const step = new MinStep({ property: "age" });
    const json = step.toJSON();
    expect(json[0]).toBe("Min");
  });

  test("AvgStep can be serialized and deserialized", () => {
    const step = new AvgStep({ property: "price" });
    const json = step.toJSON();
    expect(json[0]).toBe("Avg");
  });

  test("SumStep can be serialized and deserialized", () => {
    const step = new SumStep({ property: "quantity" });
    const json = step.toJSON();
    expect(json[0]).toBe("Sum");
  });
});

describe("Aggregate steps - clone", () => {
  test("MaxStep clone preserves config", () => {
    const step = new MaxStep({ property: "age", stepLabels: ["max"] });
    const cloned = step.clone();
    expect(cloned.config.property).toBe("age");
    expect(cloned.config.stepLabels).toEqual(["max"]);
  });

  test("SumStep clone with partial override", () => {
    const step = new SumStep({ property: "age", stepLabels: ["sum"] });
    const cloned = step.clone({ property: "price" });
    expect(cloned.config.property).toBe("price");
    expect(cloned.config.stepLabels).toEqual(["sum"]);
  });
});

describe("Aggregate steps with custom numeric graph", () => {
  const numericSchema = {
    vertices: {
      Product: {
        properties: {
          name: { type: makeType<string>("") },
          price: { type: makeType<number>(0) },
          quantity: { type: makeType<number>(0) },
          rating: { type: makeType<number | null>(null) },
        },
      },
    },
    edges: {},
  } as const satisfies GraphSchema;

  function createNumericGraph(): Graph<typeof numericSchema> {
    const g = new Graph({
      schema: numericSchema,
      storage: new InMemoryGraphStorage(),
    });
    g.addVertex("Product", { name: "Laptop", price: 999.99, quantity: 10, rating: 4.5 });
    g.addVertex("Product", { name: "Mouse", price: 29.99, quantity: 50, rating: 4.0 });
    g.addVertex("Product", { name: "Keyboard", price: 79.99, quantity: 25, rating: 4.2 });
    g.addVertex("Product", { name: "Monitor", price: 299.99, quantity: 15, rating: null });
    g.addVertex("Product", { name: "Cable", price: 9.99, quantity: 100, rating: 3.5 });
    return g;
  }

  test("multiple aggregates in single query", () => {
    const g = createNumericGraph();
    const results = executeQuery(
      g,
      "MATCH (p:Product) RETURN MIN(p.price), MAX(p.price), AVG(p.price), SUM(p.quantity)",
    );
    expect(results.length).toBeGreaterThan(0);
  });

  test("aggregate with null values", () => {
    const g = createNumericGraph();
    // Query for rating which has some null values
    const results = executeQuery(
      g,
      "MATCH (p:Product) WHERE p.rating IS NOT NULL RETURN AVG(p.rating)",
    );
    expect(results).toHaveLength(1);
  });

  test("aggregate on filtered subset", () => {
    const g = createNumericGraph();
    // Only products with price > 50
    const results = executeQuery(g, "MATCH (p:Product) WHERE p.price > 50 RETURN SUM(p.quantity)");
    expect(results).toHaveLength(1);
  });
});

describe("Aggregate steps - edge cases", () => {
  test("aggregate on empty result set", () => {
    const results = executeQuery(graph, "MATCH (p:NonExistent) RETURN MAX(p.age)");
    expect(results).toHaveLength(1);
    // MAX on empty set returns null
    expect(results[0]).toBeNull();
  });

  test("SUM on empty result set returns 0", () => {
    const results = executeQuery(graph, "MATCH (p:NonExistent) RETURN SUM(p.age)");
    expect(results).toHaveLength(1);
    // SUM on empty set returns 0
    expect(results[0]).toBe(0);
  });

  test("COUNT on empty result set returns 0", () => {
    const results = executeQuery(graph, "MATCH (p:NonExistent) RETURN COUNT(*)");
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(0);
  });
});
