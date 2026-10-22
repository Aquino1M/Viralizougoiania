import assert from "node:assert/strict";
import { test } from "node:test";
import { isPastArchiveCutoff } from "../lib/archive-policy.ts";

test("archives a published item only after the cutoff, falling back to creation date", () => {
  const cutoff = Date.parse("2026-10-19T12:00:00.000Z");

  assert.equal(isPastArchiveCutoff("2026-10-19T11:59:59.999Z", null, cutoff), true);
  assert.equal(isPastArchiveCutoff("2026-10-19T12:00:00.000Z", null, cutoff), false);
  assert.equal(isPastArchiveCutoff(null, "2026-10-19T11:00:00.000Z", cutoff), true);
  assert.equal(isPastArchiveCutoff(null, "invalid-date", cutoff), false);
});
