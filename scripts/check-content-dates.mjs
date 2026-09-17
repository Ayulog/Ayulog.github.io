import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "astro/zod";
import {
  contentDateSchema,
  optionalContentDateSchema,
} from "../src/utils/contentDate.ts";

const dates = z.object({
  pubDatetime: contentDateSchema,
  modDatetime: optionalContentDateSchema,
});
const published = new Date("2026-09-17T10:20:30.000Z");

test("accepts YAML Date objects and CMS ISO strings with timezones", () => {
  for (const value of [
    published,
    "2026-09-17T10:20:30Z",
    "2026-09-17T18:20:30+08:00",
    "2026-09-17T06:20:30-04:00",
  ]) {
    const result = dates.parse({ pubDatetime: value, modDatetime: value });
    assert.equal(result.pubDatetime.toISOString(), published.toISOString());
    assert.equal(result.modDatetime.toISOString(), published.toISOString());
  }
});

test("accepts an omitted or empty modification date without inventing a date", () => {
  assert.equal(dates.parse({ pubDatetime: published }).modDatetime, undefined);
  assert.equal(
    dates.parse({ pubDatetime: published, modDatetime: "" }).modDatetime,
    undefined
  );
  assert.equal(
    dates.parse({ pubDatetime: published, modDatetime: null }).modDatetime,
    null
  );
});

test("rejects missing, empty, null, or numeric publication dates", () => {
  assert.equal(dates.safeParse({}).success, false);
  for (const value of [undefined, "", null, 0, 1789640430000]) {
    assert.equal(dates.safeParse({ pubDatetime: value }).success, false);
  }
});

test("rejects malformed, impossible, ambiguous, or numeric dates in either field", () => {
  for (const value of [
    "not-a-date",
    "2026-02-30T10:20:30Z",
    "2026-09-17T10:20:30+99:99",
    "2026-09-17T10:20:30",
    "2026-09-17",
    " ",
    0,
    false,
    new Date("invalid"),
  ]) {
    assert.equal(dates.safeParse({ pubDatetime: value }).success, false);
    assert.equal(
      dates.safeParse({ pubDatetime: published, modDatetime: value }).success,
      false
    );
  }
});
