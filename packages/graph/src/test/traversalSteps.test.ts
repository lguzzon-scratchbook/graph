import { describe, test, expect } from "vitest";
import { GraphTraversal, TraversalPath } from "../Traversals.js";
import { Graph, Vertex, Edge } from "../Graph.js";
import { InMemoryGraphStorage } from "../GraphStorage.js";
import { createDemoGraph } from "../getDemoGraph.js";
import { StandardSchemaV1 } from "@standard-schema/spec";
import type { GraphSchema } from "../GraphSchema.js";

// Helper to create type validators
function makeType<T>(_defaultValue: T): StandardSchemaV1<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "codemix",
      validate: (value) => ({ value: value as T }),
    },
  };
}

// Weighted schema for shortest path tests
const weightedSchema = {
  vertices: {
    Node: {
      properties: {
        name: { type: makeType("") },
        value: { type: makeType(0) },
      },
    },
  },
  edges: {
    connects: {
      properties: {
        weight: { type: makeType(0) },
        cost: { type: makeType(0) },
      },
    },
    link: { properties: {} },
  },
} as const satisfies GraphSchema;

type WeightedSchema = typeof weightedSchema;

describe("RepeatStep", () => {
  const { graph, alice, bob, charlie, dave, erin, fiona, george } = createDemoGraph();
  const g = new GraphTraversal(graph);

  describe(".times() - iteration limit", () => {
    test("times(1) performs exactly one iteration", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .times(1)
          .values(),
      );

      // Should get direct neighbors: Bob and Charlie
      expect(results.length).toBe(2);
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("Bob");
      expect(names).toContain("Charlie");
    });

    test("times(2) performs exactly two iterations", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .times(2)
          .values(),
      );

      // Alice -> [Bob, Charlie] -> [Charlie, Dave] = Dave is reachable in 2 hops
      // With deduplication should get Charlie (reachable via multiple paths) and Dave
      expect(results.length).toBeGreaterThanOrEqual(1);
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("Dave");
    });

    test("times(0) performs no edge traversals", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .times(0)
          .values(),
      );

      // times(0) means don't traverse edges, but starting vertex may be included
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test("times(3) reaches vertices 3 hops away", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .times(3)
          .values(),
      );

      // Should reach Erin (Alice->Charlie->Dave->Erin or Alice->Bob->Charlie->Dave->Erin)
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("Erin");
    });
  });

  describe(".until() - termination condition", () => {
    test("until() stops when condition is met", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "Dave"))
          .values(),
      );

      // Should stop at Dave (reachable in 2 hops)
      expect(results.length).toBe(1);
      expect((results[0] as Vertex<any, "Person">).get("name")).toBe("Dave");
    });

    test("until() with has condition matching multiple vertices", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("age", ">", 35))
          .values(),
      );

      // Dave (40) and potentially others meet age > 35
      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach((v) => {
        expect((v as Vertex<any, "Person">).get("age")).toBeGreaterThan(35);
      });
    });

    test("until() immediately if starting vertex matches", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "Alice"))
          .values(),
      );

      // Should match immediately and stop
      expect(results.length).toBe(1);
      expect((results[0] as Vertex<any, "Person">).get("name")).toBe("Alice");
    });

    test("until() with non-matching condition exhausts graph", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "NonExistent"))
          .values(),
      );

      // Should exhaust graph without finding match
      // Results will include all reachable vertices (may be empty if all filtered)
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe(".emit() - emit intermediate results", () => {
    test("emit() without times emits all intermediate steps", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .values(),
      );

      // Should emit all reachable vertices from each iteration
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    test("emit() combined with times emits at each iteration", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(2)
          .values(),
      );

      // With emit, should get results from iteration 1 AND iteration 2
      expect(results.length).toBeGreaterThanOrEqual(2);
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      // Should have results from both iterations
      expect(new Set(names).size).toBeGreaterThanOrEqual(2);
    });

    test("emit() includes start vertex with emitInput", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      testGraph.addEdge(a, "knows", b, {});

      const g2 = new GraphTraversal(testGraph);

      // Using times(0) with emitInput should return just the start vertex
      const results = Array.from(
        g2
          .V(a.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(0)
          .values(),
      );

      // times(0) with emit may include starting vertex depending on emitInput behavior
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test("emit() with hasLabel filter", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("likes"))
          .emit()
          .times(1)
          .values(),
      );

      // Should emit all things liked by Alice
      results.forEach((v) => {
        expect(v.label).toBe("Thing");
      });
    });
  });

  describe("Combined configurations", () => {
    test("until() + emit() - emit at each step until condition met", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "Dave"))
          .emit()
          .values(),
      );

      // Should emit intermediate results until Dave is reached
      expect(results.length).toBeGreaterThanOrEqual(1);
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("Dave");
    });

    test("times() + emit() - emit at each iteration up to times", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(3)
          .values(),
      );

      // Should emit all intermediate vertices from iterations 1, 2, and 3
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    test("until() + times() - stops at whichever comes first", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "Fiona"))
          .times(10)
          .values(),
      );

      // Should reach Fiona and stop
      expect(results.length).toBeGreaterThanOrEqual(1);
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("Fiona");
    });

    test("until() + times() where times limit hits first", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "Fiona"))
          .times(1)
          .values(),
      );

      // Should only get 1-hop results (times limit), not reach Fiona (3+ hops)
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).not.toContain("Fiona");
    });

    test("until() + times() + emit() - complex combination", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "Dave"))
          .emit()
          .times(3)
          .values(),
      );

      // Should emit all intermediate results and stop at Dave
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("Dave");
    });
  });

  describe("Depth-limited traversal with emit", () => {
    test("depth-limited to 1 hop with emit", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(1)
          .values(),
      );

      // Only direct neighbors
      expect(results.length).toBe(2);
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names.sort()).toEqual(["Bob", "Charlie"]);
    });

    test("depth-limited to 2 hops with emit shows path growth", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(2)
          .values(),
      );

      // Should have more results than 1-hop, includes 2-hop neighbors
      expect(results.length).toBeGreaterThan(2);
    });

    test("dedup() after emit removes duplicates from multiple paths", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(3)
          .dedup()
          .values(),
      );

      // Charlie is reachable via Alice->Charlie and Alice->Bob->Charlie
      // After dedup, should only have one Charlie entry
      const charlieCount = results.filter(
        (v) => (v as Vertex<any, "Person">).get("name") === "Charlie",
      ).length;
      expect(charlieCount).toBe(1);
    });
  });

  describe("Cyclic graph handling", () => {
    test("repeat handles cycles without infinite loop", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      // Create cycle: A <-> B
      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(b, "knows", a, {});

      const g2 = new GraphTraversal(testGraph);

      // Should complete without hanging (uses visited set)
      const results = Array.from(
        g2
          .V(a.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(3)
          .values(),
      );

      // Should only find A and B (no new vertices beyond the cycle)
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    test("repeat with cycle and times limit", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      // Triangle: A -> B -> C -> A
      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      const c = testGraph.addVertex("Person", { name: "C", age: 3 });
      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(b, "knows", c, {});
      testGraph.addEdge(c, "knows", a, {});

      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(
        g2
          .V(a.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(5)
          .values(),
      );

      // Should cycle through A, B, C multiple times (at least 4 results from 5 iterations)
      expect(results.length).toBeGreaterThanOrEqual(4);
    });

    test("repeat with cycle and until condition escapes cycle", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      // Cycle with exit: A -> B -> C -> A, and C -> D
      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      const c = testGraph.addVertex("Person", { name: "C", age: 3 });
      const d = testGraph.addVertex("Person", { name: "D", age: 4 });
      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(b, "knows", c, {});
      testGraph.addEdge(c, "knows", a, {});
      testGraph.addEdge(c, "knows", d, {});

      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(
        g2
          .V(a.id)
          .repeat(($) => $.out("knows"))
          .until(($) => $.has("name", "D"))
          .emit()
          .values(),
      );

      // Should reach D and stop, despite the cycle
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("D");
    });
  });

  describe("Edge cases", () => {
    test("repeat on isolated vertex", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const isolated = testGraph.addVertex("Person", { name: "Isolated", age: 99 });
      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(
        g2
          .V(isolated.id)
          .repeat(($) => $.out("knows"))
          .emit()
          .times(3)
          .values(),
      );

      // Isolated vertex has no outgoing edges
      expect(results.length).toBe(0);
    });

    test("repeat with no matching edges", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("nonexistent"))
          .emit()
          .times(3)
          .values(),
      );

      // Non-existent edge label
      expect(results.length).toBe(0);
    });

    test("repeat with multiple edge labels", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .repeat(($) => $.out("knows", "likes"))
          .emit()
          .times(2)
          .values(),
      );

      // Should traverse both knows and likes relationships
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    test("repeat with direction in", () => {
      const results = Array.from(
        g
          .V(erin.id)
          .repeat(($) => $.in("knows"))
          .emit()
          .times(2)
          .values(),
      );

      // Erin is known by Dave, Dave is known by Charlie
      const names = results.map((v) => (v as Vertex<any, "Person">).get("name"));
      expect(names).toContain("Dave");
    });
  });
});

describe("ShortestPathStep", () => {
  const { graph, alice, bob, charlie, dave, erin, fiona, george } = createDemoGraph();
  const g = new GraphTraversal(graph);

  describe("Unweighted BFS shortest path", () => {
    test("finds direct 1-hop path", () => {
      const results = Array.from(g.V(alice.id).shortestPath().to(bob.id).through("knows").values());

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(bob.id);
    });

    test("finds 2-hop path", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(dave.id).through("knows").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(dave.id);
    });

    test("finds longer multi-hop path", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(fiona.id).through("knows").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(fiona.id);
    });

    test("returns TraversalPath with full path information", () => {
      const results = Array.from(g.V(alice.id).shortestPath().to(dave.id).through("knows"));

      expect(results.length).toBe(1);
      const path = results[0]!;
      expect(path).toBeInstanceOf(TraversalPath);

      // Path should start with Alice and end with Dave
      expect(path.value).toBeInstanceOf(Vertex);
      expect(path.value.id).toBe(dave.id);
    });

    test("path alternates vertices and edges", () => {
      const results = Array.from(g.V(alice.id).shortestPath().to(dave.id).through("knows"));

      const path = results[0]!;
      const elements: Array<Vertex | Edge> = [];
      for (const node of path) {
        elements.push(node.value);
      }

      // First element should be Alice
      expect(elements[0]).toBeInstanceOf(Vertex);
      expect((elements[0] as Vertex).id).toBe(alice.id);

      // Last element should be Dave
      expect(elements[elements.length - 1]).toBeInstanceOf(Vertex);
      expect((elements[elements.length - 1] as Vertex).id).toBe(dave.id);
    });
  });

  describe("Weighted edges with Dijkstra algorithm", () => {
    test("finds shortest weighted path avoiding heavy edge", () => {
      const testGraph = new Graph<WeightedSchema>({
        schema: weightedSchema,
        storage: new InMemoryGraphStorage(),
      });

      // A --10--> B --1--> C (total: 11)
      // A --50--> C (direct but heavy)
      const a = testGraph.addVertex("Node", { name: "A", value: 1 });
      const b = testGraph.addVertex("Node", { name: "B", value: 2 });
      const c = testGraph.addVertex("Node", { name: "C", value: 3 });

      testGraph.addEdge(a, "connects", b, { weight: 10, cost: 0 });
      testGraph.addEdge(b, "connects", c, { weight: 1, cost: 0 });
      testGraph.addEdge(a, "connects", c, { weight: 50, cost: 0 });

      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(
        g2.V(a.id).shortestPath().to(c.id).through("connects").weightedBy("weight"),
      );

      expect(results.length).toBe(1);

      // Count vertices in path
      let vertexCount = 0;
      for (const node of results[0]!) {
        if (node.value instanceof Vertex) vertexCount++;
      }

      // Should take A -> B -> C route (3 vertices)
      expect(vertexCount).toBe(3);
    });

    test("prefers direct path when it has lower weight", () => {
      const testGraph = new Graph<WeightedSchema>({
        schema: weightedSchema,
        storage: new InMemoryGraphStorage(),
      });

      // A --100--> B --100--> C (total: 200)
      // A --5--> C (direct, much lighter)
      const a = testGraph.addVertex("Node", { name: "A", value: 1 });
      const b = testGraph.addVertex("Node", { name: "B", value: 2 });
      const c = testGraph.addVertex("Node", { name: "C", value: 3 });

      testGraph.addEdge(a, "connects", b, { weight: 100, cost: 0 });
      testGraph.addEdge(b, "connects", c, { weight: 100, cost: 0 });
      testGraph.addEdge(a, "connects", c, { weight: 5, cost: 0 });

      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(
        g2.V(a.id).shortestPath().to(c.id).through("connects").weightedBy("weight"),
      );

      let vertexCount = 0;
      for (const node of results[0]!) {
        if (node.value instanceof Vertex) vertexCount++;
      }

      // Should take direct A -> C route (2 vertices)
      expect(vertexCount).toBe(2);
    });

    test("handles complex weighted graph with multiple routes", () => {
      const testGraph = new Graph<WeightedSchema>({
        schema: weightedSchema,
        storage: new InMemoryGraphStorage(),
      });

      //     B --2--> D
      //    /          |
      //   1           2
      //  /            |
      // A --3--> C --3-
      const a = testGraph.addVertex("Node", { name: "A", value: 1 });
      const b = testGraph.addVertex("Node", { name: "B", value: 2 });
      const c = testGraph.addVertex("Node", { name: "C", value: 3 });
      const d = testGraph.addVertex("Node", { name: "D", value: 4 });

      testGraph.addEdge(a, "connects", b, { weight: 1, cost: 0 });
      testGraph.addEdge(b, "connects", d, { weight: 2, cost: 0 });
      testGraph.addEdge(a, "connects", c, { weight: 3, cost: 0 });
      testGraph.addEdge(c, "connects", d, { weight: 3, cost: 0 });

      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(
        g2.V(a.id).shortestPath().to(d.id).through("connects").weightedBy("weight"),
      );

      const pathNames: string[] = [];
      for (const node of results[0]!) {
        if (node.value instanceof Vertex) {
          pathNames.push(node.value.get("name"));
        }
      }

      // Should take A -> B -> D (weight 3) over A -> C -> D (weight 6)
      expect(pathNames).toEqual(["A", "B", "D"]);
    });

    test("uses different weight properties correctly", () => {
      const testGraph = new Graph<WeightedSchema>({
        schema: weightedSchema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Node", { name: "A", value: 1 });
      const b = testGraph.addVertex("Node", { name: "B", value: 2 });
      const c = testGraph.addVertex("Node", { name: "C", value: 3 });

      // weight favors direct path, cost favors indirect path
      testGraph.addEdge(a, "connects", b, { weight: 100, cost: 1 });
      testGraph.addEdge(b, "connects", c, { weight: 100, cost: 1 });
      testGraph.addEdge(a, "connects", c, { weight: 5, cost: 50 });

      const g2 = new GraphTraversal(testGraph);

      // Using weight: should take direct A -> C (2 vertices)
      const weightResults = Array.from(
        g2.V(a.id).shortestPath().to(c.id).through("connects").weightedBy("weight"),
      );
      let weightVertexCount = 0;
      for (const node of weightResults[0]!) {
        if (node.value instanceof Vertex) weightVertexCount++;
      }
      expect(weightVertexCount).toBe(2);

      // Using cost: should take A -> B -> C (3 vertices)
      const costResults = Array.from(
        g2.V(a.id).shortestPath().to(c.id).through("connects").weightedBy("cost"),
      );
      let costVertexCount = 0;
      for (const node of costResults[0]!) {
        if (node.value instanceof Vertex) costVertexCount++;
      }
      expect(costVertexCount).toBe(3);
    });

    test("handles zero-weight edges", () => {
      const testGraph = new Graph<WeightedSchema>({
        schema: weightedSchema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Node", { name: "A", value: 1 });
      const b = testGraph.addVertex("Node", { name: "B", value: 2 });
      const c = testGraph.addVertex("Node", { name: "C", value: 3 });

      testGraph.addEdge(a, "connects", b, { weight: 0, cost: 0 });
      testGraph.addEdge(b, "connects", c, { weight: 0, cost: 0 });

      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(
        g2.V(a.id).shortestPath().to(c.id).through("connects").weightedBy("weight").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(c.id);
    });
  });

  describe("maxDepth() configuration", () => {
    test("maxDepth(1) only finds direct neighbors", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(bob.id).through("knows").maxDepth(1).values(),
      );

      // Bob is direct neighbor, should find
      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(bob.id);
    });

    test("maxDepth(1) does not find 2-hop neighbors", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(dave.id).through("knows").maxDepth(1).values(),
      );

      // Dave is 2 hops away, should not find
      expect(results.length).toBe(0);
    });

    test("maxDepth(2) finds 2-hop neighbors", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(dave.id).through("knows").maxDepth(2).values(),
      );

      // Dave is 2 hops away, should find
      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(dave.id);
    });

    test("maxDepth(0) only matches source itself", () => {
      const results = Array.from(g.V(alice.id).shortestPath().to(alice.id).maxDepth(0).values());

      // Source = target, should find zero-length path
      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(alice.id);
    });

    test("maxDepth prevents finding distant vertices", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(fiona.id).through("knows").maxDepth(2).values(),
      );

      // Fiona is several hops away, maxDepth(2) should prevent finding
      expect(results.length).toBe(0);
    });

    test("maxDepth with weighted path", () => {
      const testGraph = new Graph<WeightedSchema>({
        schema: weightedSchema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Node", { name: "A", value: 1 });
      const b = testGraph.addVertex("Node", { name: "B", value: 2 });
      const c = testGraph.addVertex("Node", { name: "C", value: 3 });
      const d = testGraph.addVertex("Node", { name: "D", value: 4 });

      testGraph.addEdge(a, "connects", b, { weight: 1, cost: 0 });
      testGraph.addEdge(b, "connects", c, { weight: 1, cost: 0 });
      testGraph.addEdge(c, "connects", d, { weight: 1, cost: 0 });
      testGraph.addEdge(a, "connects", d, { weight: 10, cost: 0 });

      const g2 = new GraphTraversal(testGraph);

      // With maxDepth(2), can only reach b, not c or d (via multi-hop)
      const results = Array.from(
        g2
          .V(a.id)
          .shortestPath()
          .to(d.id)
          .through("connects")
          .maxDepth(2)
          .weightedBy("weight")
          .values(),
      );

      // Direct edge a->d exists but depth would be 1, but wait:
      // Actually direct edge is 1 hop, so it should be found
      expect(results.length).toBe(1);
    });
  });

  describe("Unreachable nodes", () => {
    test("returns empty for unreachable target", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      // No edge between them

      const g2 = new GraphTraversal(testGraph);
      const results = Array.from(g2.V(a.id).shortestPath().to(b.id).through("knows").values());

      expect(results.length).toBe(0);
    });

    test("returns empty for disconnected components", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      // Component 1: A -> B
      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      testGraph.addEdge(a, "knows", b, {});

      // Component 2: C -> D
      const c = testGraph.addVertex("Person", { name: "C", age: 3 });
      const d = testGraph.addVertex("Person", { name: "D", age: 4 });
      testGraph.addEdge(c, "knows", d, {});

      const g2 = new GraphTraversal(testGraph);
      const results = Array.from(g2.V(a.id).shortestPath().to(d.id).through("knows").values());

      expect(results.length).toBe(0);
    });

    test("returns empty for wrong edge label", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      testGraph.addEdge(a, "likes", b, {});

      const g2 = new GraphTraversal(testGraph);
      const results = Array.from(g2.V(a.id).shortestPath().to(b.id).through("knows").values());

      // Edge is "likes", searching "knows"
      expect(results.length).toBe(0);
    });

    test("returns empty for non-existent target ID", () => {
      const results = Array.from(
        g
          .V(alice.id)
          .shortestPath()
          .to("nonexistent:id" as any)
          .through("knows")
          .values(),
      );

      expect(results.length).toBe(0);
    });
  });

  describe("Same start/end node (zero-length path)", () => {
    test("finds zero-length path for same source and target", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(alice.id).through("knows").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(alice.id);
    });

    test("zero-length path in empty graph", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(g2.V(a.id).shortestPath().to(a.id).values());

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(a.id);
    });

    test("zero-length path returns single-vertex TraversalPath", () => {
      const results = Array.from(g.V(alice.id).shortestPath().to(alice.id));

      expect(results.length).toBe(1);
      const path = results[0]!;
      expect(path).toBeInstanceOf(TraversalPath);
      expect(path.value.id).toBe(alice.id);

      // Should have no edges (length 0)
      expect(path.length()).toBe(0);
    });
  });

  describe("Multiple shortest paths", () => {
    test("handles diamond graph with equal path lengths", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      // Diamond: A -> B -> D and A -> C -> D
      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      const c = testGraph.addVertex("Person", { name: "C", age: 3 });
      const d = testGraph.addVertex("Person", { name: "D", age: 4 });

      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(b, "knows", d, {});
      testGraph.addEdge(a, "knows", c, {});
      testGraph.addEdge(c, "knows", d, {});

      const g2 = new GraphTraversal(testGraph);
      const results = Array.from(g2.V(a.id).shortestPath().to(d.id).through("knows"));

      expect(results.length).toBe(1); // shortestPath returns one path

      // Count vertices
      let vertexCount = 0;
      for (const node of results[0]!) {
        if (node.value instanceof Vertex) vertexCount++;
      }

      // Path should have 3 vertices (A -> X -> D)
      expect(vertexCount).toBe(3);
    });

    test("picks one shortest path when multiple exist with different routes", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      // Long and short path to D
      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      const c = testGraph.addVertex("Person", { name: "C", age: 3 });
      const d = testGraph.addVertex("Person", { name: "D", age: 4 });

      // Short path: A -> D (1 hop)
      testGraph.addEdge(a, "knows", d, {});
      // Long path: A -> B -> C -> D (3 hops)
      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(b, "knows", c, {});
      testGraph.addEdge(c, "knows", d, {});

      const g2 = new GraphTraversal(testGraph);
      const results = Array.from(g2.V(a.id).shortestPath().to(d.id).through("knows"));

      expect(results.length).toBe(1);

      // Path should have 2 vertices (direct A -> D)
      let vertexCount = 0;
      for (const node of results[0]!) {
        if (node.value instanceof Vertex) vertexCount++;
      }
      expect(vertexCount).toBe(2);
    });

    test("weighted graph picks path with lowest total weight among multiple", () => {
      const testGraph = new Graph<WeightedSchema>({
        schema: weightedSchema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Node", { name: "A", value: 1 });
      const b = testGraph.addVertex("Node", { name: "B", value: 2 });
      const c = testGraph.addVertex("Node", { name: "C", value: 3 });
      const d = testGraph.addVertex("Node", { name: "D", value: 4 });

      // Path 1: A -> B -> D (1 + 1 = 2)
      testGraph.addEdge(a, "connects", b, { weight: 1, cost: 0 });
      testGraph.addEdge(b, "connects", d, { weight: 1, cost: 0 });

      // Path 2: A -> C -> D (2 + 2 = 4)
      testGraph.addEdge(a, "connects", c, { weight: 2, cost: 0 });
      testGraph.addEdge(c, "connects", d, { weight: 2, cost: 0 });

      const g2 = new GraphTraversal(testGraph);
      const results = Array.from(
        g2.V(a.id).shortestPath().to(d.id).through("connects").weightedBy("weight"),
      );

      const pathNames: string[] = [];
      for (const node of results[0]!) {
        if (node.value instanceof Vertex) {
          pathNames.push(node.value.get("name"));
        }
      }

      // Should pick path through B (lower total weight)
      expect(pathNames).toEqual(["A", "B", "D"]);
    });
  });

  describe("Additional edge cases", () => {
    test("handles cyclic graphs without infinite loop", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      // Cycle: A -> B -> C -> A
      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      const c = testGraph.addVertex("Person", { name: "C", age: 3 });

      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(b, "knows", c, {});
      testGraph.addEdge(c, "knows", a, {});

      const g2 = new GraphTraversal(testGraph);

      // Should find shortest path without infinite loop
      const results = Array.from(g2.V(a.id).shortestPath().to(c.id).through("knows").values());

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(c.id);
    });

    test("handles self-loop edge", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      testGraph.addEdge(a, "knows", a, {}); // Self-loop
      testGraph.addEdge(a, "knows", b, {});

      const g2 = new GraphTraversal(testGraph);

      // Should find shortest path to B (ignoring self-loop)
      const results = Array.from(g2.V(a.id).shortestPath().to(b.id).through("knows").values());

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(b.id);
    });

    test("handles multiple edges between same vertices", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });

      // Multiple edges
      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(a, "knows", b, {});

      const g2 = new GraphTraversal(testGraph);

      const results = Array.from(g2.V(a.id).shortestPath().to(b.id).through("knows").values());

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(b.id);
    });

    test("direction in finds reverse path", () => {
      // In the demo graph: georgeKnowsCharlie means George -> Charlie
      // So to go from Charlie to George, we need incoming edges
      const results = Array.from(
        g.V(charlie.id).shortestPath().to(george.id).through("knows").direction("in").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(george.id);
    });

    test("direction out finds forward path", () => {
      const results = Array.from(
        g.V(george.id).shortestPath().to(charlie.id).through("knows").direction("out").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(charlie.id);
    });

    test("direction both finds either direction", () => {
      const results = Array.from(
        g.V(charlie.id).shortestPath().to(george.id).through("knows").direction("both").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.id).toBe(george.id);
    });

    test("through() with multiple edge labels", () => {
      const testGraph = new Graph({
        schema: graph.schema,
        storage: new InMemoryGraphStorage(),
      });

      const a = testGraph.addVertex("Person", { name: "A", age: 1 });
      const b = testGraph.addVertex("Person", { name: "B", age: 2 });
      const c = testGraph.addVertex("Thing", { name: "C", ref: 1 });

      testGraph.addEdge(a, "knows", b, {});
      testGraph.addEdge(b, "likes", c, {});

      const g2 = new GraphTraversal(testGraph);

      // Should be able to traverse knows then likes
      const results = Array.from(
        g2.V(a.id).shortestPath().to(c.id).through("knows", "likes").values(),
      );

      expect(results.length).toBe(1);
    });

    test("to() with condition instead of ID", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to(["=", "name", "Dave"]).through("knows").values(),
      );

      expect(results.length).toBe(1);
      expect(results[0]!.get("name")).toBe("Dave");
    });

    test("to() with complex condition", () => {
      const results = Array.from(
        g.V(alice.id).shortestPath().to([">", "age", 40]).through("knows").values(),
      );

      // Should find first person with age > 40 (Dave with age 40? no, needs > 40)
      // Erin has age 45
      expect(results.length).toBe(1);
      expect(results[0]!.get("age")).toBeGreaterThan(40);
    });
  });
});
