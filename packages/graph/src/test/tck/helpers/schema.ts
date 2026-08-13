/**
 * TCK schema factory.
 * Builds the permissive TCK graph schema and the graph-construction helper.
 */
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { GraphSchema } from "../../../GraphSchema.js";
import { Graph } from "../../../Graph.js";
import { InMemoryGraphStorage } from "../../../GraphStorage.js";

/**
 * Creates a mock StandardSchemaV1 type for testing.
 * Accepts any value without validation.
 */
export function makeType<T>(): StandardSchemaV1<T> {
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

/**
 * Dynamic property type for TCK schema.
 * Accepts any JSON-serializable value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TckPropertyValue = any;

/**
 * Property definition that accepts any value.
 */
const anyProperty = { type: makeType<TckPropertyValue>() };/**
 * TCK schema with permissive vertex and edge types.
 * Supports common TCK labels (A, B, C, etc.) and edge types (T, T1, T2, KNOWS, etc.).
 * Properties are flexible to accept any value.
 */
export const tckSchema = {
  vertices: {
    // Single-letter labels common in TCK
    A: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
        scores: anyProperty,
        items: anyProperty,
        price: anyProperty,
      },
    },
    B: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    C: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    D: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    E: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    X: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Y: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Z: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    // Common named labels
    Label: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Foo: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Bar: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Node: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Person: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
        age: anyProperty,
        email: anyProperty,
        firstname: anyProperty,
      },
    },
    Start: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    End: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Root: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Leaf: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    DoesExist: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    Single: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    TheLabel: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        created: anyProperty,
        x: anyProperty,
        y: anyProperty,
        a: anyProperty,
        b: anyProperty,
        c: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        foo: anyProperty,
        bar: anyProperty,
        baz: anyProperty,
        list: anyProperty,
        flag: anyProperty,
      },
    },
    // Additional labels for Match tests
    Artist: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        var: anyProperty,
      },
    },
    Blue: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Red: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Green: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Yellow: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Label1: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Label2: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Label3: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Looper: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Movie: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    NotThere: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    NonExistent: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Player: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Team: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // MatchWhere test labels
    TextNode: { properties: { name: anyProperty, var: anyProperty } },
    IntNode: { properties: { name: anyProperty, var: anyProperty } },
    // Create test labels
    Dog: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    Begin: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    N: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    T: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // Return test labels
    L: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // Delete test labels
    User: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    DoesNotExist: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // Comparison test labels
    Child: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        var: anyProperty,
      },
    },
    // Quantifier test labels
    SNodes: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    SRelationships: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
  },
  edges: {
    // Single-letter edge types
    T: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    T1: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    T2: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    R: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    REL: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    // Common named edge types
    KNOWS: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
        since: anyProperty,
      },
    },
    FRIEND: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    FRIENDS: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    LIKES: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    OWNS: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    HAS: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    RELATED: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    RELATED_TO: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    CONTAINS: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    LINK: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    LOOP: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    SELF: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    BLOCKS: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    FOLLOWS: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    X: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    Y: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        prop: anyProperty,
        property: anyProperty,
        value: anyProperty,
        data: anyProperty,
      },
    },
    // Additional edge types for Match tests
    A: { properties: { name: anyProperty, num: anyProperty, id: anyProperty } },
    B: { properties: { name: anyProperty, num: anyProperty, id: anyProperty } },
    T3: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    T4: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    TYPE: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    HATES: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    WONDERS: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    FOO: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    BAR: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    NOT_EXIST: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    CONNECTED_TO: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    WORKED_WITH: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        year: anyProperty,
      },
    },
    EDGE: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    NOR_THIS: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    PLAYS_FOR: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    SUPPORTS: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    ATE: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        times: anyProperty,
      },
    },
    // MatchWhere test edge types
    ADMIN: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    E1: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    E2: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // Create test edge types
    R1: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    R2: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    R3: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    ACTED_IN: {
      properties: {
        name: anyProperty,
        num: anyProperty,
        id: anyProperty,
        roles: anyProperty,
      },
    },
    DIRECTED: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    PRODUCED: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    WROTE: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // Delete test edge types
    DoesNotExist: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // Pattern test edge types
    REL1: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    REL2: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    REL3: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    REL4: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
    // ExistentialSubquery test edge types
    NA: {
      properties: { name: anyProperty, num: anyProperty, id: anyProperty },
    },
  },
} as const satisfies GraphSchema;

export type TckSchema = typeof tckSchema;

/**
 * Creates a new graph with the TCK schema for testing.
 */
export function createTckGraph(): Graph<TckSchema> {
  return new Graph({
    schema: tckSchema,
    storage: new InMemoryGraphStorage(),
  });
}
