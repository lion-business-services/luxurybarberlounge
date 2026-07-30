import test from "node:test";
import assert from "node:assert/strict";
import { selectPrimaryRole } from "../../src/lib/auth/config.ts";

test("owner wins over automatically-created client role", () => {
  assert.equal(selectPrimaryRole(["client", "owner"]), "owner");
});

test("manager wins over client and receptionist", () => {
  assert.equal(selectPrimaryRole(["client", "receptionist", "manager"]), "manager");
});

test("empty roles fail closed to client landing", () => {
  assert.equal(selectPrimaryRole([]), "client");
});
