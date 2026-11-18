import { test } from "node:test";
import assert from "node:assert/strict";
import { drawMatches, buildForbidden, shuffle } from "./draw.js";

function people(names) {
  return names.map((name, i) => ({ id: `p${i + 1}`, name }));
}

function assertValidDraw(result, folks, exclusions = []) {
  assert.equal(result.ok, true, result.ok ? "" : result.error);
  const ids = folks.map((p) => p.id);
  const forbidden = buildForbidden(ids, exclusions);
  const givers = result.matches.map((m) => m.giverId).sort();
  const receivers = result.matches.map((m) => m.receiverId).sort();
  assert.deepEqual(givers, [...ids].sort());
  assert.deepEqual(receivers, [...ids].sort());
  for (const { giverId, receiverId } of result.matches) {
    assert.notEqual(giverId, receiverId, "no self-matches");
    assert.equal(
      forbidden.has(`${giverId}->${receiverId}`),
      false,
      `exclusion violated: ${giverId} -> ${receiverId}`
    );
  }
}

test("everyone gets someone else (no self-matches) over many random draws", () => {
  const folks = people(["Maya", "Jordan", "Sam", "Riley", "Alex"]);
  for (let i = 0; i < 80; i++) {
    assertValidDraw(drawMatches(folks), folks);
  }
});

test("exclusion pairs are never matched in either direction", () => {
  const folks = people(["Maya", "Jordan", "Sam", "Riley", "Alex", "Casey"]);
  const exclusions = [
    ["p1", "p2"], // Maya ↔ Jordan
    ["p3", "p4"], // Sam ↔ Riley
  ];
  for (let i = 0; i < 80; i++) {
    const result = drawMatches(folks, exclusions);
    assertValidDraw(result, folks, exclusions);
  }
});

test("object-shaped exclusions work the same as tuples", () => {
  const folks = people(["Maya", "Jordan", "Sam", "Riley"]);
  const exclusions = [{ a: "p1", b: "p2" }];
  assertValidDraw(drawMatches(folks, exclusions), folks, exclusions);
});

test("two people with no exclusions still swap gifts", () => {
  const folks = people(["Maya", "Jordan"]);
  const result = drawMatches(folks);
  assertValidDraw(result, folks);
  const map = Object.fromEntries(result.matches.map((m) => [m.giverId, m.receiverId]));
  assert.equal(map.p1, "p2");
  assert.equal(map.p2, "p1");
});

test("returns a friendly error when there are fewer than two people", () => {
  const none = drawMatches([]);
  assert.equal(none.ok, false);
  assert.match(none.error, /at least two/i);

  const one = drawMatches(people(["Maya"]));
  assert.equal(one.ok, false);
  assert.match(one.error, /at least two/i);
});

test("returns a friendly error when exclusions make a draw impossible", () => {
  // Two people who are not allowed to buy for each other have nobody left.
  const couple = people(["Maya", "Jordan"]);
  const blocked = drawMatches(couple, [["p1", "p2"]]);
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /impossible/i);
  assert.doesNotMatch(blocked.error, /undefined|null|Error/i);

  // One person excluded from everyone else.
  const four = people(["Maya", "Jordan", "Sam", "Riley"]);
  const isolated = drawMatches(four, [
    ["p1", "p2"],
    ["p1", "p3"],
    ["p1", "p4"],
  ]);
  assert.equal(isolated.ok, false);
  assert.match(isolated.error, /impossible/i);
});

test("a tight but possible graph still finds a draw", () => {
  // Four people, each excluded from one other, still solvable.
  const folks = people(["A", "B", "C", "D"]);
  const exclusions = [
    ["p1", "p2"],
    ["p3", "p4"],
  ];
  for (let i = 0; i < 40; i++) {
    assertValidDraw(drawMatches(folks, exclusions), folks, exclusions);
  }
});

test("seeded rng is deterministic", () => {
  const folks = people(["Maya", "Jordan", "Sam", "Riley", "Alex"]);
  const makeRng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
      return a / 0x100000000;
    };
  };
  const a = drawMatches(folks, [], { rng: makeRng(42) });
  const b = drawMatches(folks, [], { rng: makeRng(42) });
  assert.deepEqual(a, b);
});

test("shuffle does not mutate the original array", () => {
  const input = [1, 2, 3, 4];
  const copy = input.slice();
  const out = shuffle(input, () => 0.2);
  assert.deepEqual(input, copy);
  assert.equal(out.length, 4);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4]);
});
