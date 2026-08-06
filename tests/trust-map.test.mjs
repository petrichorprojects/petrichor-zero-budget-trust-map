import test from "node:test";
import assert from "node:assert/strict";
import { generateTrustMap } from "../logic.js";

test("returns five unique buyer trust surfaces", () => {
  const map = generateTrustMap({
    product: "Workforce planning software",
    buyer: "COOs at 100–500 person companies",
    type: "software",
    price: "high"
  });

  assert.equal(map.surfaces.length, 5);
  assert.equal(new Set(map.surfaces.map((surface) => surface.id)).size, 5);
  assert.ok(map.surfaces.every((surface) => surface.prompt.includes("COOs")));
  assert.equal(map.coverage, 0);
});

test("empty surfaces move ahead of an otherwise strong surface", () => {
  const input = {
    product: "Executive positioning advisory",
    buyer: "Series A founders",
    type: "service",
    price: "enterprise"
  };
  const baseline = generateTrustMap(input);
  const strongest = baseline.surfaces[0].id;
  const statuses = Object.fromEntries(baseline.surfaces.map((surface) => [surface.id, "empty"]));
  statuses[strongest] = "strong";

  const updated = generateTrustMap(input, statuses);

  assert.notEqual(updated.surfaces[0].id, strongest);
  assert.equal(updated.strongCount, 1);
  assert.ok(updated.coverage > 0);
});

test("local services prioritize reviews and branded search", () => {
  const map = generateTrustMap({
    product: "Residential roof repair",
    buyer: "Local homeowners",
    type: "local",
    price: "considered"
  });
  const ids = map.surfaces.map((surface) => surface.id);

  assert.ok(ids.indexOf("reviews") < 3);
  assert.ok(ids.indexOf("brandedSearch") < 3);
});