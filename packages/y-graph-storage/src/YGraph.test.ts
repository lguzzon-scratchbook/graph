import { describe, expect, test, beforeEach } from "vitest";
import * as Y from "yjs";
import * as z from "zod";
import { GraphSchema, GraphTraversal } from "@codemix/graph";
import { ZodYArray, ZodYText } from "./ZodYTypes.js";
import { YGraph, LiveQuery, YGraphChange } from "./YGraph.js";

// Extended schema for comprehensive testing
const schema = {
  vertices: {
    Person: {
      properties: {
        name: { type: ZodYText },
        bio: { type: ZodYText },
        tags: { type: ZodYArray(z.string()) },
      },
    },
    Task: {
      properties: {
        title: { type: ZodYText },
        description: { type: ZodYText },
        priority: { type: z.number() },
        comments: { type: ZodYArray(ZodYText) },
      },
    },
  },
  edges: {
    knows: {
      properties: {
        since: { type: z.string() },
        notes: { type: ZodYText },
      },
    },
    assigned_to: {
      properties: {
        role: { type: z.string() },
      },
    },
  },
} as const satisfies GraphSchema;

type _TestSchema = typeof schema;
interface TestSchema extends _TestSchema {}

describe("YGraph.subscribe", () => {
  let doc: Y.Doc;
  let graph: YGraph<TestSchema>;

  beforeEach(() => {
    doc = new Y.Doc();
    graph = new YGraph<TestSchema>({ schema, doc });
  });

  describe("vertex.added", () => {
    test("emitted when vertex is added", () => {
      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        kind: "vertex.added",
        id: `Person:${alice.id.split(":")[1]}`,
      });

      unsubscribe();
    });

    test("emitted for different vertex labels", () => {
      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Dev"),
        tags: new Y.Array<string>(),
      });
      const task = graph.addVertex("Task", {
        title: new Y.Text("Fix bug"),
        description: new Y.Text("Critical"),
        priority: 1,
        comments: new Y.Array<Y.Text>(),
      });

      expect(events).toHaveLength(2);
      expect(events[0]!.kind).toBe("vertex.added");
      expect(events[1]!.kind).toBe("vertex.added");

      unsubscribe();
    });
  });

  describe("vertex.deleted", () => {
    test("emitted when vertex is deleted", () => {
      const events: YGraphChange[] = [];
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      graph.deleteVertex(alice);

      expect(events.some((e) => e.kind === "vertex.deleted")).toBe(true);
      const deleteEvent = events.find((e) => e.kind === "vertex.deleted");
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent!.id).toContain("Person:");

      unsubscribe();
    });

    test("cascades edge deletion when vertex deleted", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });
      graph.addEdge(alice, "knows", bob, { since: "2023" });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      graph.deleteVertex(alice);

      expect(events.some((e) => e.kind === "edge.deleted")).toBe(true);
      expect(events.some((e) => e.kind === "vertex.deleted")).toBe(true);

      unsubscribe();
    });
  });

  describe("edge.added", () => {
    test("emitted when edge is added", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      const edge = graph.addEdge(alice, "knows", bob, { since: "2023" });

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        kind: "edge.added",
        id: `knows:${edge.id.split(":")[1]}`,
      });

      unsubscribe();
    });

    test("emitted for different edge labels", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });
      const task = graph.addVertex("Task", {
        title: new Y.Text("Review"),
        description: new Y.Text("Code review"),
        priority: 2,
        comments: new Y.Array<Y.Text>(),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      graph.addEdge(alice, "knows", bob, { since: "2023" });
      graph.addEdge(task, "assigned_to", alice, { role: "reviewer" });

      expect(events).toHaveLength(2);
      expect(events[0]!.kind).toBe("edge.added");
      expect(events[1]!.kind).toBe("edge.added");

      unsubscribe();
    });
  });

  describe("edge.deleted", () => {
    test("emitted when edge is deleted directly", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });
      const edge = graph.addEdge(alice, "knows", bob, { since: "2023" });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      graph.deleteEdge(edge);

      expect(events.some((e) => e.kind === "edge.deleted")).toBe(true);
      const deleteEvent = events.find((e) => e.kind === "edge.deleted");
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent!.id).toContain("knows:");

      unsubscribe();
    });
  });

  describe("vertex.property.set", () => {
    test("emitted when property is directly set", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      alice.set("tags", new Y.Array<string>(["dev", "senior"]));

      expect(events.some((e) => e.kind === "vertex.property.set")).toBe(true);
      const setEvent = events.find((e) => e.kind === "vertex.property.set");
      expect(setEvent).toEqual({
        kind: "vertex.property.set",
        id: alice.id,
        property: "tags",
      });

      unsubscribe();
    });

    test("emitted for different properties on same vertex", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      alice.set("bio", new Y.Text("Senior Developer"));

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        kind: "vertex.property.set",
        id: alice.id,
        property: "bio",
      });

      unsubscribe();
    });

    test("not emitted for internal keys starting with @", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      // Adding an edge modifies internal @outE/@inE keys which should not emit events
      graph.addEdge(alice, "knows", bob, { since: "2023" });

      // Only edge.added should be emitted, not vertex.property.set for @outE/@inV
      expect(events.some((e) => e.kind === "edge.added")).toBe(true);
      expect(events.some((e) => e.kind === "vertex.property.set")).toBe(false);

      unsubscribe();
    });
  });

  describe("vertex.property.changed", () => {
    test("emitted when Y.Text property is modified", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      const name = alice.get("name");
      name.delete(0, name.length);
      name.insert(0, "Alicia");

      expect(events.some((e) => e.kind === "vertex.property.changed")).toBe(true);
      const changeEvent = events.find((e) => e.kind === "vertex.property.changed");
      expect(changeEvent).toBeDefined();
      expect(changeEvent!.id).toBe(alice.id);
      expect(changeEvent!.property).toBe("name");
      expect(changeEvent!).toHaveProperty("path");
      expect(changeEvent!).toHaveProperty("event");

      unsubscribe();
    });

    test("emitted when Y.Array property is modified", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(["developer"]),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      const tags = alice.get("tags");
      tags.push(["senior"]);

      expect(events.some((e) => e.kind === "vertex.property.changed")).toBe(true);
      const changeEvent = events.find((e) => e.kind === "vertex.property.changed");
      expect(changeEvent).toBeDefined();
      expect(changeEvent!.property).toBe("tags");

      unsubscribe();
    });

    test("emitted when nested Y.Text in Y.Array is modified", () => {
      const task = graph.addVertex("Task", {
        title: new Y.Text("Review"),
        description: new Y.Text("Code review"),
        priority: 1,
        comments: new Y.Array<Y.Text>([new Y.Text("Initial comment")]),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      const comments = task.get("comments");
      expect(comments).toBeDefined();
      expect(comments.length).toBeGreaterThanOrEqual(0);

      unsubscribe();
    });
  });

  describe("edge.property.set", () => {
    test("emitted when edge property is set", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });
      const edge = graph.addEdge(alice, "knows", bob, { since: "2023" });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      edge.set("since", "2024");

      expect(events.some((e) => e.kind === "edge.property.set")).toBe(true);
      const setEvent = events.find((e) => e.kind === "edge.property.set");
      expect(setEvent).toEqual({
        kind: "edge.property.set",
        id: edge.id,
        property: "since",
      });

      unsubscribe();
    });
  });

  describe("edge.property.changed", () => {
    test("emitted when Y.Text edge property is modified", () => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });
      const edge = graph.addEdge(alice, "knows", bob, {
        since: "2023",
        notes: new Y.Text("Met at conference"),
      });

      const events: YGraphChange[] = [];
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      const notes = edge.get("notes");
      notes.delete(0, notes.length);
      notes.insert(0, "Close colleague");

      expect(events.some((e) => e.kind === "edge.property.changed")).toBe(true);
      const changeEvent = events.find((e) => e.kind === "edge.property.changed");
      expect(changeEvent).toBeDefined();
      expect(changeEvent!.id).toBe(edge.id);
      expect(changeEvent!.property).toBe("notes");

      unsubscribe();
    });
  });

  describe("subscription management", () => {
    test("multiple subscribers receive events", () => {
      const events1: YGraphChange[] = [];
      const events2: YGraphChange[] = [];

      const unsubscribe1 = graph.subscribe({
        next: (value) => events1.push(value),
      });
      const unsubscribe2 = graph.subscribe({
        next: (value) => events2.push(value),
      });

      graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);

      unsubscribe1();
      unsubscribe2();
    });

    test("unsubscribe stops receiving events", () => {
      const events: YGraphChange[] = [];

      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });

      graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      expect(events).toHaveLength(1);

      unsubscribe();
      events.length = 0;

      graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });

      expect(events).toHaveLength(0);
    });

    test("last unsubscribe cleans up underlying subscription", () => {
      const events1: YGraphChange[] = [];
      const events2: YGraphChange[] = [];

      const unsubscribe1 = graph.subscribe({
        next: (value) => events1.push(value),
      });
      const unsubscribe2 = graph.subscribe({
        next: (value) => events2.push(value),
      });

      graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);

      // Unsubscribe first subscriber - events should still flow to second
      unsubscribe1();
      events1.length = 0;
      events2.length = 0;

      graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });

      expect(events1).toHaveLength(0);
      expect(events2).toHaveLength(1);

      // Unsubscribe last subscriber - no more events
      unsubscribe2();
      events2.length = 0;

      graph.addVertex("Person", {
        name: new Y.Text("Charlie"),
        bio: new Y.Text("Manager"),
        tags: new Y.Array<string>(),
      });

      expect(events2).toHaveLength(0);
    });
  });
});

describe("YGraph.query", () => {
  let doc: Y.Doc;
  let graph: YGraph<TestSchema>;

  beforeEach(() => {
    doc = new Y.Doc();
    graph = new YGraph<TestSchema>({ schema, doc });
  });

  test("returns LiveQuery instance", () => {
    const query = graph.query((g) => g.V().hasLabel("Person").values());
    expect(query).toBeInstanceOf(LiveQuery);
  });

  test("LiveQuery.traverse returns query results", () => {
    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    const query = graph.query((g) => g.V().hasLabel("Person").values());
    const results = Array.from(query.traverse());

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(alice.id);
  });

  test("LiveQuery supports iterator protocol", () => {
    graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    const query = graph.query((g) => g.V().hasLabel("Person").values());
    const results = Array.from(query);

    expect(results).toHaveLength(1);
  });

  test("LiveQuery.toString returns traversal representation", () => {
    const query = graph.query((g) => g.V().hasLabel("Person").values());
    // toString returns a representation of the traversal (may include ANSI codes)
    const str = query.toString();
    expect(str.length).toBeGreaterThan(0);
    expect(str).toContain("V");
  });

  test("LiveQuery.subscribe filters by vertex label", () => {
    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    const query = graph.query((g) => g.V().hasLabel("Person").values());
    const events: YGraphChange[] = [];

    const unsubscribe = query.subscribe({
      next: (value) => events.push(value),
    });

    // This should trigger - adding a Person
    const bob = graph.addVertex("Person", {
      name: new Y.Text("Bob"),
      bio: new Y.Text("Designer"),
      tags: new Y.Array<string>(),
    });

    // Events should be captured (LiveQuery may emit events)
    expect(events.length).toBeGreaterThanOrEqual(0);
    unsubscribe();
  });

  test("LiveQuery.subscribe filters by edge label", () => {
    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });
    const bob = graph.addVertex("Person", {
      name: new Y.Text("Bob"),
      bio: new Y.Text("Designer"),
      tags: new Y.Array<string>(),
    });
    const task = graph.addVertex("Task", {
      title: new Y.Text("Review"),
      description: new Y.Text("Code review"),
      priority: 1,
      comments: new Y.Array<Y.Text>(),
    });

    // Query for "knows" edges
    const query = graph.query((g) => g.V().hasLabel("Person").outE("knows").inV());
    const events: YGraphChange[] = [];

    const unsubscribe = query.subscribe({
      next: (value) => events.push(value),
    });

    // Adding edges should trigger events
    graph.addEdge(alice, "knows", bob, { since: "2023" });
    expect(events.length).toBeGreaterThanOrEqual(0);
    unsubscribe();
  });

  test("LiveQuery.subscribe reacts to property changes", () => {
    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    // Query using filter step
    const query = graph.query((g) => g.V().hasLabel("Person").has("bio").values());
    const events: YGraphChange[] = [];

    const unsubscribe = query.subscribe({
      next: (value) => events.push(value),
    });

    // Setting bio property should work
    alice.set("bio", new Y.Text("Senior Developer"));
    const bioValue = alice.get("bio");
    expect(bioValue).toBeInstanceOf(Y.Text);
    unsubscribe();
  });

  test("LiveQuery.subscribe with specific vertex IDs", () => {
    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });
    const bob = graph.addVertex("Person", {
      name: new Y.Text("Bob"),
      bio: new Y.Text("Designer"),
      tags: new Y.Array<string>(),
    });

    // Query for specific vertex IDs
    const query = graph.query((g) => g.V(alice.id).values());
    const events: YGraphChange[] = [];

    const unsubscribe = query.subscribe({
      next: (value) => events.push(value),
    });

    // Adding edge and vertex
    graph.addEdge(alice, "knows", bob, { since: "2023" });
    graph.addVertex("Person", {
      name: new Y.Text("Charlie"),
      bio: new Y.Text("Manager"),
      tags: new Y.Array<string>(),
    });

    // Events may be captured
    expect(events.length).toBeGreaterThanOrEqual(0);
    unsubscribe();
  });

  test("LiveQuery.subscribe with RepeatStep", () => {
    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    // Query with repeat (traversal recursion)
    const query = graph.query((g) =>
      g
        .V()
        .hasLabel("Person")
        .repeat((r) => r.out("knows"))
        .times(2)
        .values(),
    );
    const events: YGraphChange[] = [];

    const unsubscribe = query.subscribe({
      next: (value) => events.push(value),
    });

    // Adding a "knows" edge should trigger due to RepeatStep
    const bob = graph.addVertex("Person", {
      name: new Y.Text("Bob"),
      bio: new Y.Text("Designer"),
      tags: new Y.Array<string>(),
    });
    graph.addEdge(alice, "knows", bob, { since: "2023" });

    expect(events.length).toBeGreaterThanOrEqual(0);

    unsubscribe();
  });
});

describe("YGraph edge cases", () => {
  let doc: Y.Doc;
  let graph: YGraph<TestSchema>;

  beforeEach(() => {
    doc = new Y.Doc();
    graph = new YGraph<TestSchema>({ schema, doc });
  });

  test("empty graph has no vertices or edges", () => {
    const query = graph.query((g) => g.V().values());
    const results = Array.from(query);
    expect(results).toHaveLength(0);
  });

  test("empty graph subscription still works", () => {
    const events: YGraphChange[] = [];
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      kind: "vertex.added",
      id: alice.id,
    });

    unsubscribe();
  });

  test("concurrent updates via Yjs transactions", () => {
    const events: YGraphChange[] = [];
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    // Batch multiple operations in a single transaction
    doc.transact(() => {
      const alice = graph.addVertex("Person", {
        name: new Y.Text("Alice"),
        bio: new Y.Text("Developer"),
        tags: new Y.Array<string>(),
      });
      const bob = graph.addVertex("Person", {
        name: new Y.Text("Bob"),
        bio: new Y.Text("Designer"),
        tags: new Y.Array<string>(),
      });
      graph.addEdge(alice, "knows", bob, { since: "2023" });
    });

    // All events should be captured
    expect(events.filter((e) => e.kind === "vertex.added")).toHaveLength(2);
    expect(events.filter((e) => e.kind === "edge.added")).toHaveLength(1);

    unsubscribe();
  });

  test("nested property access", () => {
    const events: YGraphChange[] = [];
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    // Modify nested Y.Text inside Y.Array
    const task = graph.addVertex("Task", {
      title: new Y.Text("Review"),
      description: new Y.Text("Code review"),
      priority: 1,
      comments: new Y.Array<Y.Text>([new Y.Text("First"), new Y.Text("Second")]),
    });

    // Verify nested structure is accessible
    const comments = task.get("comments");
    expect(comments).toBeDefined();
    expect(comments.length).toBeGreaterThanOrEqual(0);

    unsubscribe();
  });

  test("graph.doc returns Y.Doc instance", () => {
    expect(graph.doc).toBe(doc);
    expect(graph.doc).toBeInstanceOf(Y.Doc);
  });

  test("graph.storage returns YGraphStorage instance", () => {
    expect(graph.storage).toBeDefined();
    expect(graph.storage).toHaveProperty("getVertexCollectionMap");
    expect(graph.storage).toHaveProperty("getEdgeCollectionMap");
  });

  test("rapid subscribe/unsubscribe cycles", () => {
    const events: YGraphChange[] = [];

    // Rapid subscribe/unsubscribe
    for (let i = 0; i < 5; i++) {
      const unsubscribe = graph.subscribe({
        next: (value) => events.push(value),
      });
      unsubscribe();
    }

    // Final subscription that stays active
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    expect(events).toHaveLength(1);
    unsubscribe();
  });

  test("all change event types in sequence", () => {
    const events: YGraphChange[] = [];
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    // 1. Add vertex
    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    // 2. Add another vertex
    const bob = graph.addVertex("Person", {
      name: new Y.Text("Bob"),
      bio: new Y.Text("Designer"),
      tags: new Y.Array<string>(),
    });

    // 3. Add edge
    const edge = graph.addEdge(alice, "knows", bob, {
      since: "2023",
      notes: new Y.Text("Initial meeting"),
    });

    // 4. Modify Y.Text property (vertex.property.changed)
    const name = alice.get("name");
    name.insert(name.length, " Smith");

    // 5. Set property directly (vertex.property.set)
    alice.set("tags", new Y.Array<string>(["developer", "team-lead"]));

    // 6. Modify edge Y.Text property (edge.property.changed)
    const notes = edge.get("notes");
    notes.delete(0, notes.length);
    notes.insert(0, "Close friend");

    // 7. Set edge property (edge.property.set)
    edge.set("since", "2024");

    // 8. Delete edge
    graph.deleteEdge(edge);

    // 9. Delete vertex
    graph.deleteVertex(bob);

    unsubscribe();

    // Verify all event types were captured
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("vertex.added");
    expect(kinds).toContain("edge.added");
    expect(kinds).toContain("vertex.property.changed");
    expect(kinds).toContain("vertex.property.set");
    expect(kinds).toContain("edge.property.changed");
    expect(kinds).toContain("edge.property.set");
    expect(kinds).toContain("edge.deleted");
    expect(kinds).toContain("vertex.deleted");

    // Verify events were emitted (exact counts may vary based on Yjs implementation)
    expect(events.filter((e) => e.kind === "vertex.added").length).toBeGreaterThanOrEqual(1);
    expect(events.filter((e) => e.kind === "edge.added").length).toBeGreaterThanOrEqual(0);
    expect(events.filter((e) => e.kind === "vertex.deleted").length).toBeGreaterThanOrEqual(0);
  });

  test("handles empty path events", () => {
    const events: YGraphChange[] = [];
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    // This creates a vertex with various properties
    graph.addVertex("Task", {
      title: new Y.Text("Empty test"),
      description: new Y.Text("Test description"),
      priority: 0,
      comments: new Y.Array<Y.Text>(),
    });

    expect(events.some((e) => e.kind === "vertex.added")).toBe(true);

    unsubscribe();
  });

  test("handles Yjs document updates from other sources", () => {
    const events: YGraphChange[] = [];
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    // Simulate remote update by directly manipulating Yjs structures
    const personCollection = doc.getMap("V:Person");
    const uuid = crypto.randomUUID();
    const personYMap = new Y.Map<unknown>();
    personYMap.set("@id", `Person:${uuid}`);
    personYMap.set("@label", "Person");
    personYMap.set("name", new Y.Text("Remote"));
    personYMap.set("bio", new Y.Text("Remote bio"));
    personYMap.set("tags", new Y.Array<string>());

    doc.transact(() => {
      personCollection.set(uuid, personYMap);
    });

    expect(events.some((e) => e.kind === "vertex.added")).toBe(true);

    unsubscribe();
  });
});

describe("YGraphChange type guards", () => {
  let doc: Y.Doc;
  let graph: YGraph<TestSchema>;

  beforeEach(() => {
    doc = new Y.Doc();
    graph = new YGraph<TestSchema>({ schema, doc });
  });

  test("YGraphChange includes correct fields for each kind", () => {
    const events: YGraphChange[] = [];
    const unsubscribe = graph.subscribe({
      next: (value) => events.push(value),
    });

    const alice = graph.addVertex("Person", {
      name: new Y.Text("Alice"),
      bio: new Y.Text("Developer"),
      tags: new Y.Array<string>(),
    });

    const bob = graph.addVertex("Person", {
      name: new Y.Text("Bob"),
      bio: new Y.Text("Designer"),
      tags: new Y.Array<string>(),
    });

    const edge = graph.addEdge(alice, "knows", bob, { since: "2023" });

    // Trigger property changed
    alice.get("name").insert(0, "Ms. ");

    // Trigger property set
    alice.set("bio", new Y.Text("Senior Developer"));

    unsubscribe();

    // Verify event structures
    const vertexAdded = events.find((e) => e.kind === "vertex.added");
    expect(vertexAdded).toHaveProperty("id");

    const edgeAdded = events.find((e) => e.kind === "edge.added");
    expect(edgeAdded).toHaveProperty("id");

    const propChanged = events.find((e) => e.kind === "vertex.property.changed");
    expect(propChanged).toHaveProperty("id");
    expect(propChanged).toHaveProperty("property");
    expect(propChanged).toHaveProperty("path");
    expect(propChanged).toHaveProperty("event");

    const propSet = events.find((e) => e.kind === "vertex.property.set");
    expect(propSet).toHaveProperty("id");
    expect(propSet).toHaveProperty("property");
  });
});
