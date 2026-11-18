import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodePayload,
  decodePayload,
  composeSms,
  formatTitleForSms,
  formatBudget,
  formatDate,
  smsUri,
  parseRevealHash,
  revealHash,
} from "./codec.js";

test("encode then decode returns the same payload", () => {
  const payload = {
    title: "The Swanson Family Secret Santa",
    giver: "Maya",
    receiver: "Riley",
    budget: "$25",
    date: "December 24, 2026",
  };
  const token = encodePayload(payload);
  assert.equal(typeof token, "string");
  assert.doesNotMatch(token, /[+/=]/);
  assert.deepEqual(decodePayload(token), payload);
});

test("decode returns null for garbage", () => {
  assert.equal(decodePayload(""), null);
  assert.equal(decodePayload("%%%"), null);
  assert.equal(decodePayload("not-valid"), null);
});

test("title formatting drops a leading The for SMS copy", () => {
  assert.equal(
    formatTitleForSms("The Swanson Family Secret Santa"),
    "Swanson Family Secret Santa"
  );
  assert.equal(formatTitleForSms("Swanson Swap"), "Swanson Swap");
});

test("composeSms matches the expected wording", () => {
  const msg = composeSms({
    giverName: "Maya",
    title: "The Swanson Family Secret Santa",
    link: "https://example.com/#r/abc",
    budget: "25",
    date: "2026-12-24",
  });
  assert.equal(
    msg,
    "Ho ho ho, Maya! Your Secret Santa match for The Swanson Family Secret Santa is ready: https://example.com/#r/abc (budget $25, exchange December 24, 2026)"
  );
});

test("composeSms omits empty budget and date", () => {
  const msg = composeSms({
    giverName: "Sam",
    title: "The Swanson Family Secret Santa",
    link: "https://example.com/#r/xyz",
    budget: "",
    date: "",
  });
  assert.equal(
    msg,
    "Ho ho ho, Sam! Your Secret Santa match for The Swanson Family Secret Santa is ready: https://example.com/#r/xyz"
  );
});

test("formatBudget and formatDate", () => {
  assert.equal(formatBudget("25"), "$25");
  assert.equal(formatBudget("$40"), "$40");
  assert.equal(formatBudget("around 20"), "around 20");
  assert.equal(formatBudget(""), "");
  assert.equal(formatDate("2026-12-24"), "December 24, 2026");
  assert.equal(formatDate("December 24, 2026"), "December 24, 2026");
});

test("sms URI is cross-platform and encodes the body", () => {
  const uri = smsUri("(555) 010-1001", "Ho ho ho, Maya!");
  assert.equal(uri.startsWith("sms:5550101001?&body="), true);
  assert.equal(uri.includes(encodeURIComponent("Ho ho ho, Maya!")), true);
  const blank = smsUri("", "hello");
  assert.equal(blank.startsWith("sms:?&body="), true);
});

test("reveal hash round-trips", () => {
  const token = encodePayload({ giver: "Maya", receiver: "Riley" });
  assert.equal(parseRevealHash(revealHash(token)), token);
  assert.equal(parseRevealHash("#r/" + token), token);
  assert.equal(parseRevealHash("#setup"), null);
});

test("payload never includes the word Eisele", () => {
  const token = encodePayload({
    title: "The Swanson Family Secret Santa",
    giver: "Maya",
    receiver: "Jordan",
  });
  const decoded = JSON.stringify(decodePayload(token));
  assert.doesNotMatch(decoded, /Eisele/i);
  assert.match(decoded, /Swanson/);
});
