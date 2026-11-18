/**
 * Secret Santa draw: a random derangement that also respects exclusion pairs.
 * Works in the browser and in Node tests.
 */

/**
 * @typedef {{ id: string, name: string, phone?: string }} Person
 * @typedef {{ ok: true, matches: { giverId: string, receiverId: string }[] }} DrawSuccess
 * @typedef {{ ok: false, error: string }} DrawFailure
 */

const TOO_FEW = "You need at least two people to draw names.";
const IMPOSSIBLE =
  "Those exclusions make a fair draw impossible — someone would have no valid person left to buy for. Try removing a restriction or adding another person.";

/**
 * Fisher–Yates shuffle. Pass a custom rng (returns 0–1) for tests.
 * @template T
 * @param {T[]} list
 * @param {() => number} rng
 * @returns {T[]}
 */
export function shuffle(list, rng = Math.random) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a bidirectional exclusion set of "giver->receiver" keys,
 * always including self-matches.
 * @param {string[]} ids
 * @param {Array<[string, string] | { a: string, b: string }>} exclusions
 */
export function buildForbidden(ids, exclusions = []) {
  const forbidden = new Set();
  for (const id of ids) forbidden.add(`${id}->${id}`);
  for (const pair of exclusions) {
    const a = Array.isArray(pair) ? pair[0] : pair.a;
    const b = Array.isArray(pair) ? pair[1] : pair.b;
    if (!a || !b || a === b) continue;
    forbidden.add(`${a}->${b}`);
    forbidden.add(`${b}->${a}`);
  }
  return forbidden;
}

function canGive(forbidden, giver, receiver) {
  return !forbidden.has(`${giver}->${receiver}`);
}

/**
 * Randomly assign each person exactly one recipient.
 * Nobody draws themselves, every exclusion is respected,
 * and everyone both gives and receives once.
 *
 * @param {Person[]} people
 * @param {Array<[string, string] | { a: string, b: string }>} exclusions
 * @param {{ rng?: () => number }} [options]
 * @returns {DrawSuccess | DrawFailure}
 */
export function drawMatches(people, exclusions = [], options = {}) {
  const rng = options.rng || Math.random;
  const cleaned = (people || []).filter((p) => p && p.id);
  if (cleaned.length < 2) return { ok: false, error: TOO_FEW };

  const ids = cleaned.map((p) => p.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return { ok: false, error: "Each person needs their own entry before you can draw." };
  }

  const forbidden = buildForbidden(ids, exclusions);

  const possible = new Map();
  for (const giver of ids) {
    const opts = ids.filter((receiver) => canGive(forbidden, giver, receiver));
    if (opts.length === 0) return { ok: false, error: IMPOSSIBLE };
    possible.set(giver, opts);
  }

  /** @type {((givers: string[], remaining: Set<string>, assignment: Record<string, string>) => Record<string, string> | null)} */
  function backtrack(givers, remaining, assignment) {
    if (givers.length === 0) return assignment;

    // Most-constrained giver first, ties broken randomly so draws stay fun.
    let bestIdx = 0;
    let bestCount = Infinity;
    const scores = givers.map((g) => {
      let n = 0;
      for (const r of remaining) if (canGive(forbidden, g, r)) n += 1;
      return n;
    });
    const min = Math.min(...scores);
    const tied = [];
    for (let i = 0; i < givers.length; i++) {
      if (scores[i] === min) tied.push(i);
    }
    bestIdx = tied.length === 1 ? tied[0] : tied[Math.floor(rng() * tied.length)];
    bestCount = scores[bestIdx];
    if (bestCount === 0) return null;

    const giver = givers[bestIdx];
    const rest = givers.filter((_, i) => i !== bestIdx);
    const candidates = shuffle(
      [...remaining].filter((r) => canGive(forbidden, giver, r)),
      rng
    );

    for (const receiver of candidates) {
      remaining.delete(receiver);
      assignment[giver] = receiver;
      const found = backtrack(rest, remaining, assignment);
      if (found) return found;
      delete assignment[giver];
      remaining.add(receiver);
    }
    return null;
  }

  const assignment = backtrack(ids.slice(), new Set(ids), {});
  if (!assignment) return { ok: false, error: IMPOSSIBLE };

  const matches = ids.map((giverId) => ({
    giverId,
    receiverId: assignment[giverId],
  }));
  return { ok: true, matches };
}

/**
 * Turn a successful draw into a name map for display or encoding.
 * @param {Person[]} people
 * @param {{ giverId: string, receiverId: string }[]} matches
 */
export function matchNames(people, matches) {
  const byId = new Map(people.map((p) => [p.id, p]));
  return matches.map((m) => ({
    giver: byId.get(m.giverId) || null,
    receiver: byId.get(m.receiverId) || null,
  }));
}
