import test from "node:test";
import assert from "node:assert/strict";
import { capabilitiesForRole, hasCapability } from "../../src/lib/permissions/matrix.ts";

test("clients have self-service permissions and no operational authority", () => {
  assert.equal(hasCapability("client", "orders:own"), true);
  assert.equal(hasCapability("client", "membership:own"), true);
  assert.equal(hasCapability("client", "commission:manage"), false);
  assert.equal(hasCapability("client", "users:manage"), false);
  assert.equal(hasCapability("client", "integrations:manage"), false);
});

test("reception can run the floor but cannot access governance", () => {
  assert.equal(hasCapability("receptionist", "queue:manage"), true);
  assert.equal(hasCapability("receptionist", "profile:client_manage"), true);
  assert.equal(hasCapability("receptionist", "settings:manage"), false);
  assert.equal(hasCapability("receptionist", "audit:read"), false);
});

test("managers run operations without owner-only integration or role controls", () => {
  assert.equal(hasCapability("manager", "client:manage"), true);
  assert.equal(hasCapability("manager", "automation:manage"), true);
  assert.equal(hasCapability("manager", "integrations:manage"), false);
  assert.equal(hasCapability("manager", "roles:manage"), false);
});

test("owners can manage governance, integrations, and audit", () => {
  assert.equal(hasCapability("owner", "settings:manage"), true);
  assert.equal(hasCapability("owner", "audit:read"), true);
  assert.equal(hasCapability("owner", "integrations:manage"), true);
  assert.equal(hasCapability("owner", "roles:manage"), true);
  assert.ok(capabilitiesForRole("super_admin").length >= capabilitiesForRole("owner").length);
});
