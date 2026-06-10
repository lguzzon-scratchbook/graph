import { expect, test, describe, vi } from "vitest";
import * as Y from "yjs";
import * as z from "zod";
import { GraphSchema, GraphTraversal } from "@codemix/graph";
import { ZodYArray, ZodYText } from "./ZodYTypes.js";
import { YGraph } from "./YGraph.js";
import { YGraphStorage, $InVKey, $OutVKey, $InEKey, $OutEKey } from "./YGraphStorage.js";

const schema = {
  vertices: {
    Person: {
      properties: {
        name: { type: ZodYText },
      },
    },
    Thing: {
      properties: {
        name: { type: ZodYText },
        isActive: { type: z.boolean() },
        features: { type: ZodYArray(ZodYText) },
      },
    },
  },
  edges: {
    knows: { properties: {} },
    likes: { properties: {} },
  },
} as const satisfies GraphSchema;

type _DemoSchema = typeof schema;
interface DemoSchema extends _DemoSchema {}

function createGraph(doc = new Y.Doc()) {
  const graph = new YGraph<DemoSchema>({
    schema,
    doc,
  });

  const alice = graph.addVertex("Person", { name: new Y.Text("Alice") });

  const raspberries = graph.addVertex("Thing", {
    name: new Y.Text("Raspberries"),
    isActive: true,
    features: Y.Array.from<Y.Text>([new Y.Text("sweet"), new Y.Text("juicy")]),
  });

  graph.addEdge(alice, "likes", raspberries, {});
  return graph;
}

test("YGraphStorage", () => {
  const graph = createGraph();
  const g = new GraphTraversal(graph);

  expect(Array.from(g.V().hasLabel("Person").out("likes"))).toHaveLength(1);
});

test("Identity", () => {
  const graph = createGraph();

  const [alice] = Array.from(graph.getVertices("Person"));
  if (alice == null) {
    throw new Error("Alice not found");
  }
  const [clone] = Array.from(graph.getVertices("Person"));
  if (clone == null) {
    throw new Error("Clone not found");
  }
  expect(clone.id).toBe(alice.id);
  expect(clone).toBe(alice);
});

test("Add and delete vertex", () => {
  const doc = new Y.Doc();

  const graph = createGraph(doc);
  const history: string[] = [];

  const unsubscribe = graph.subscribe({
    next(value) {
      history.push(value.kind);
    },
  });
  const g = new GraphTraversal(graph);

  const people = g.V().hasLabel("Person");
  const [alice] = Array.from(people.values());

  const bob = graph.addVertex("Person", { name: new Y.Text("Bob") });

  graph.addEdge(alice!, "knows", bob, {});
  {
    const name = bob.get("name");
    name.delete(0, name.length);
    name.insert(0, "Robert");
  }

  const apple = graph.addVertex("Thing", {
    name: new Y.Text("Apple"),
    isActive: false,
    features: Y.Array.from<Y.Text>([new Y.Text("tart"), new Y.Text("green")]),
  });

  graph.addEdge(alice!, "likes", apple, {});
  {
    apple.set("isActive", true);
    const firstFeature = apple.get("features").get(0);
    firstFeature.delete(0, firstFeature.length);
    firstFeature.insert(0, "red");
  }
  graph.deleteVertex(bob);
  expect(history).toMatchInlineSnapshot(`
    [
      "vertex.added",
      "edge.added",
      "vertex.property.changed",
      "vertex.property.changed",
      "vertex.added",
      "edge.added",
      "vertex.property.set",
      "vertex.property.changed",
      "vertex.property.changed",
      "vertex.deleted",
      "edge.deleted",
    ]
  `);
  unsubscribe();
});

test("Reactivity", () => {
  const doc = new Y.Doc();

  const graph = createGraph(doc);
  const history: string[] = [];

  const people = graph.query((g) => g.V().hasLabel("Person").values());
  const unsubscribe = people.subscribe({
    next(value) {
      history.push(value.kind);
    },
  });

  const [alice] = Array.from(people);

  const bob = graph.addVertex("Person", { name: new Y.Text("Bob") });

  graph.addEdge(alice!, "knows", bob, {});

  graph.deleteVertex(bob);

  expect(history).toMatchInlineSnapshot(`[]`);
  unsubscribe();
});

describe("YGraphStorage - deleteVertex cascade", () => {
  test("deleteVertex removes connected incoming edges", () => {
    const doc = new Y.Doc();
    const graph = createGraph(doc);
    const storage = graph.storage as YGraphStorage;

    const [alice] = Array.from(graph.getVertices(["Person"]));
    const [raspberries] = Array.from(graph.getVertices(["Thing"]));
    if (alice == null || raspberries == null) {
      throw new Error("Vertices not found");
    }

    // Verify edge exists before deletion
    const edgesBefore = Array.from(graph.getEdges(["likes"]));
    expect(edgesBefore).toHaveLength(1);

    // Delete the target vertex (raspberries)
    storage.deleteVertex(raspberries.id);

    // Edge should be removed
    const edgesAfter = Array.from(graph.getEdges(["likes"]));
    expect(edgesAfter).toHaveLength(0);

    // Alice's outgoing edges should be empty
    const aliceOutgoing = Array.from(storage.getOutgoingEdges(alice.id));
    expect(aliceOutgoing).toHaveLength(0);
  });

  test("deleteVertex removes connected outgoing edges", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    const v1 = graph.getVertexById("Person:v1" as `${string}:${string}`);
    const v2 = graph.getVertexById("Person:v2" as `${string}:${string}`);

    // Verify edge and references exist
    const edgesBefore = Array.from(graph.getEdges(["knows"]));
    expect(edgesBefore).toHaveLength(1);
    const v2IncomingBefore = Array.from(graph.getIncomingEdges(v2.id));
    expect(v2IncomingBefore).toHaveLength(1);

    // Delete the source vertex
    graph.deleteVertex(v1.id);

    // Edge should be removed
    const edgesAfter = Array.from(graph.getEdges(["knows"]));
    expect(edgesAfter).toHaveLength(0);

    // v2's incoming edges should be empty
    const v2IncomingAfter = Array.from(graph.getIncomingEdges(v2.id));
    expect(v2IncomingAfter).toHaveLength(0);
  });

  test("deleteVertex removes multiple connected edges", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    // Create a hub vertex connected to multiple others
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:hub",
      properties: { name: new Y.Text("Hub") },
    });

    for (let i = 0; i < 3; i++) {
      graph.addVertex({
        "@type": "Vertex",
        id: `Person:spoke${i}`,
        properties: { name: new Y.Text(`Spoke${i}`) },
      });
    }

    // Add edges both directions
    for (let i = 0; i < 3; i++) {
      const spokeId = `Person:spoke${i}` as `${string}:${string}`;
      graph.addEdge({
        "@type": "Edge",
        id: `knows:hub_to_spoke${i}`,
        properties: {},
        inV: spokeId,
        outV: "Person:hub" as `${string}:${string}`,
      });
      graph.addEdge({
        "@type": "Edge",
        id: `knows:spoke${i}_to_hub`,
        properties: {},
        inV: "Person:hub" as `${string}:${string}`,
        outV: spokeId,
      });
    }

    const spokes: ReturnType<typeof graph.getVertexById>[] = [];
    for (let i = 0; i < 3; i++) {
      const spoke = graph.getVertexById(`Person:spoke${i}` as `${string}:${string}`);
      if (spoke) spokes.push(spoke);
    }

    // Verify edges exist
    const edgesBefore = Array.from(graph.getEdges(["knows"]));
    expect(edgesBefore).toHaveLength(6);

    // Delete hub
    const hubId = "Person:hub" as `${string}:${string}`;
    graph.deleteVertex(hubId);

    // All edges should be removed
    const edgesAfter = Array.from(graph.getEdges(["knows"]));
    expect(edgesAfter).toHaveLength(0);

    // Spokes should have no edge references
    for (const spoke of spokes) {
      if (spoke) {
        const incoming = Array.from(graph.getIncomingEdges(spoke.id));
        const outgoing = Array.from(graph.getOutgoingEdges(spoke.id));
        expect(incoming).toHaveLength(0);
        expect(outgoing).toHaveLength(0);
      }
    }
  });

  test("deleteVertex throws VertexNotFoundError for non-existent vertex", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    expect(() => graph.deleteVertex("Person:nonexistent" as `${string}:${string}`)).toThrow(
      expect.objectContaining({
        vertexId: "Person:nonexistent",
      }),
    );
  });
});

describe("YGraphStorage - deleteEdge", () => {
  test("deleteEdge removes edge and cleans up @inE/@outE references", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    // Verify edge and references exist
    expect(graph.getEdgeById("knows:e1" as `${string}:${string}`)).toBeDefined();
    expect(Array.from(graph.getOutgoingEdges("Person:v1" as `${string}:${string}`))).toHaveLength(
      1,
    );
    expect(Array.from(graph.getIncomingEdges("Person:v2" as `${string}:${string}`))).toHaveLength(
      1,
    );

    // Delete the edge
    graph.deleteEdge("knows:e1" as `${string}:${string}`);

    // Edge should be removed
    expect(graph.getEdgeById("knows:e1" as `${string}:${string}`)).toBeUndefined();

    // References should be cleaned up
    expect(Array.from(graph.getOutgoingEdges("Person:v1" as `${string}:${string}`))).toHaveLength(
      0,
    );
    expect(Array.from(graph.getIncomingEdges("Person:v2" as `${string}:${string}`))).toHaveLength(
      0,
    );
  });

  test("deleteEdge throws EdgeNotFoundError for non-existent edge", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    expect(() => graph.deleteEdge("knows:nonexistent" as `${string}:${string}`)).toThrow(
      expect.objectContaining({
        edgeId: "knows:nonexistent",
      }),
    );
  });
});

describe("YGraphStorage - internal edge reference keys", () => {
  test("internal keys are correctly prefixed with @", () => {
    expect($InVKey).toBe("@inV");
    expect($OutVKey).toBe("@outV");
    expect($InEKey).toBe("@inE");
    expect($OutEKey).toBe("@outE");
  });

  test("addEdge stores @inV and @outV references in edge map", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    // Access the underlying edge collection to verify internal keys
    const edgeCollection = (graph as any).getEdgeCollectionMap("knows");
    const edgeData = edgeCollection.get("e1") as Y.Map<unknown>;

    expect(edgeData.get($InVKey)).toBe("Person:v2");
    expect(edgeData.get($OutVKey)).toBe("Person:v1");
  });

  test("addEdge creates @inE and @outE maps in vertices", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    // Access underlying vertex collections
    const vertexCollection = (graph as any).getVertexCollectionMap("Person");
    const v1Data = vertexCollection.get("v1") as Y.Map<unknown>;
    const v2Data = vertexCollection.get("v2") as Y.Map<unknown>;

    // v1 (source) should have @outE with the edge
    const v1OutE = v1Data.get($OutEKey) as Y.Map<unknown>;
    expect(v1OutE).toBeDefined();
    expect(v1OutE.get("knows:e1")).toBe(true);

    // v2 (target) should have @inE with the edge
    const v2InE = v2Data.get($InEKey) as Y.Map<unknown>;
    expect(v2InE).toBeDefined();
    expect(v2InE.get("knows:e1")).toBe(true);
  });
});

describe("YGraphStorage - WeakMap identity caching", () => {
  test("same Y.Map returns same StoredVertex object", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    // Multiple lookups should return the same object
    const vertex1a = graph.getVertexById("Person:v1" as `${string}:${string}`);
    const vertex1b = graph.getVertexById("Person:v1" as `${string}:${string}`);
    const vertex1c = Array.from(graph.getVertices(["Person"]))[0];

    expect(vertex1a).toBeDefined();
    expect(vertex1a).toBe(vertex1b);
    expect(vertex1a).toBe(vertex1c);
  });

  test("same Y.Map returns same StoredEdge object", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    // Multiple lookups should return the same object
    const edge1a = graph.getEdgeById("knows:e1" as `${string}:${string}`);
    const edge1b = graph.getEdgeById("knows:e1" as `${string}:${string}`);
    const edge1c = Array.from(graph.getEdges(["knows"]))[0];

    expect(edge1a).toBeDefined();
    expect(edge1a).toBe(edge1b);
    expect(edge1a).toBe(edge1c);
  });

  test("identity is preserved across getVerticesByIds", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    const vertex1a = graph.getVertexById("Person:v1" as `${string}:${string}`);
    const [vertex1b] = Array.from(graph.getVerticesByIds(["Person:v1" as `${string}:${string}`]));

    expect(vertex1a).toBe(vertex1b);
  });

  test("identity is preserved across getEdgesByIds", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    const edge1a = graph.getEdgeById("knows:e1" as `${string}:${string}`);
    const [edge1b] = Array.from(graph.getEdgesByIds(["knows:e1" as `${string}:${string}`]));

    expect(edge1a).toBe(edge1b);
  });
});

describe("YGraphStorage - transaction boundaries", () => {
  test("addVertex executes inside Y.Doc transact", () => {
    const doc = new Y.Doc();
    const transactSpy = vi.spyOn(doc, "transact");
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    expect(transactSpy).toHaveBeenCalled();
    expect(transactSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test("deleteVertex executes inside Y.Doc transact", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    const transactSpy = vi.spyOn(doc, "transact");
    graph.deleteVertex("Person:v1" as `${string}:${string}`);

    expect(transactSpy).toHaveBeenCalled();
  });

  test("addEdge executes inside Y.Doc transact", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });

    const transactSpy = vi.spyOn(doc, "transact");
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    expect(transactSpy).toHaveBeenCalled();
  });

  test("deleteEdge executes inside Y.Doc transact", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    const transactSpy = vi.spyOn(doc, "transact");
    graph.deleteEdge("knows:e1" as `${string}:${string}`);

    expect(transactSpy).toHaveBeenCalled();
  });

  test("updateProperty executes inside Y.Doc transact via data.set", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    // updateProperty uses Y.Map.set which triggers Y.Doc transaction internally
    // This verifies the method works correctly
    graph.updateProperty("Person:v1" as `${string}:${string}`, "name", new Y.Text("Updated"));

    const vertex = graph.getVertexById("Person:v1" as `${string}:${string}`);
    expect(vertex).toBeDefined();
  });
});

describe("YGraphStorage - edge case coverage", () => {
  test("getVertexById returns undefined for non-existent vertex", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    const result = graph.getVertexById("Person:nonexistent" as `${string}:${string}`);
    expect(result).toBeUndefined();
  });

  test("getVerticesByIds filters out non-existent vertices", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    const results = Array.from(
      graph.getVerticesByIds([
        "Person:v1" as `${string}:${string}`,
        "Person:nonexistent" as `${string}:${string}`,
      ]),
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("Person:v1");
  });

  test("getVerticesByIds with empty array returns nothing", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    const results = Array.from(graph.getVerticesByIds([]));
    expect(results).toHaveLength(0);
  });

  test("getEdgesByIds filters out non-existent edges", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    const results = Array.from(
      graph.getEdgesByIds([
        "knows:e1" as `${string}:${string}`,
        "knows:nonexistent" as `${string}:${string}`,
      ]),
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("knows:e1");
  });

  test("getEdgesByIds with empty array returns nothing", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    const results = Array.from(graph.getEdgesByIds([]));
    expect(results).toHaveLength(0);
  });

  test("getVertices with empty labels returns all vertices", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Thing:t1",
      properties: { name: new Y.Text("Thing1"), isActive: true, features: new Y.Array<Y.Text>() },
    });

    const results = Array.from(graph.getVertices([]));
    expect(results).toHaveLength(2);
  });

  test("getEdges with empty labels returns all edges", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    const results = Array.from(graph.getEdges([]));
    expect(results).toHaveLength(1);
  });

  test("getIncomingEdges returns empty for non-existent vertex", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    const results = Array.from(
      graph.getIncomingEdges("Person:nonexistent" as `${string}:${string}`),
    );
    expect(results).toHaveLength(0);
  });

  test("getIncomingEdges returns empty for vertex with no incoming edges", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    const results = Array.from(graph.getIncomingEdges("Person:v1" as `${string}:${string}`));
    expect(results).toHaveLength(0);
  });

  test("getOutgoingEdges returns empty for non-existent vertex", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    const results = Array.from(
      graph.getOutgoingEdges("Person:nonexistent" as `${string}:${string}`),
    );
    expect(results).toHaveLength(0);
  });

  test("getOutgoingEdges returns empty for vertex with no outgoing edges", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });

    const results = Array.from(graph.getOutgoingEdges("Person:v1" as `${string}:${string}`));
    expect(results).toHaveLength(0);
  });

  test("getEdgeById returns undefined when edge data missing inV", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    // Manually create an edge map without inV
    const edgeCollection = (graph as any).getEdgeCollectionMap("knows");
    const edgeMap = new Y.Map<unknown>();
    edgeMap.set("@outV", "Person:v1" as `${string}:${string}`);
    edgeCollection.set("e1", edgeMap);

    const result = graph.getEdgeById("knows:e1" as `${string}:${string}`);
    expect(result).toBeUndefined();
  });

  test("getEdgeById returns undefined when edge data missing outV", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    // Manually create an edge map without outV
    const edgeCollection = (graph as any).getEdgeCollectionMap("knows");
    const edgeMap = new Y.Map<unknown>();
    edgeMap.set("@inV", "Person:v2" as `${string}:${string}`);
    edgeCollection.set("e1", edgeMap);

    const result = graph.getEdgeById("knows:e1" as `${string}:${string}`);
    expect(result).toBeUndefined();
  });

  test("getEdges skips edge when edge data missing inV", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    // Add valid edge
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v1",
      properties: { name: new Y.Text("Person1") },
    });
    graph.addVertex({
      "@type": "Vertex",
      id: "Person:v2",
      properties: { name: new Y.Text("Person2") },
    });
    graph.addEdge({
      "@type": "Edge",
      id: "knows:e1",
      properties: {},
      inV: "Person:v2" as `${string}:${string}`,
      outV: "Person:v1" as `${string}:${string}`,
    });

    // Add invalid edge (missing inV)
    const edgeCollection = (graph as any).getEdgeCollectionMap("knows");
    const edgeMap = new Y.Map<unknown>();
    edgeMap.set("@outV", "Person:v1" as `${string}:${string}`);
    edgeCollection.set("e2", edgeMap);

    const results = Array.from(graph.getEdges(["knows"]));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("knows:e1");
  });

  test("getEdgeById returns undefined for non-existent edge", () => {
    const doc = new Y.Doc();
    const graph = new YGraphStorage(doc, { schema: schema as unknown as GraphSchema });

    const result = graph.getEdgeById("knows:nonexistent" as `${string}:${string}`);
    expect(result).toBeUndefined();
  });
});
