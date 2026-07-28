import test from "node:test";
import assert from "node:assert/strict";
import { hasCapability } from "../../src/lib/permissions/matrix.ts";

test("clients cannot manage commission or users", () => {
  assert.equal(hasCapability("client", "commission:manage"), false);
  assert.equal(hasCapability("client", "users:manage"), false);
});

test("reception can manage queue but not owner settings", () => {
  assert.equal(hasCapability("receptionist", "queue:manage"), true);
  assert.equal(hasCapability("receptionist", "settings:manage"), false);
});

test("owners can manage settings and audit", () => {
  assert.equal(hasCapability("owner", "settings:manage"), true);
  assert.equal(hasCapability("owner", "audit:read"), true);
});
