import test from "node:test";
import assert from "node:assert/strict";
import { DevelopmentBookingProvider } from "../../src/lib/booking/development.ts";

test("development booking provider is explicit and non-live", async () => {
  const provider = new DevelopmentBookingProvider();
  const [locations, services, team] = await Promise.all([provider.listLocations(), provider.listServices(), provider.listTeamMembers()]);
  assert.equal(provider.mode, "development");
  assert.ok(locations.length > 0 && locations.every((item) => !item.live));
  assert.ok(services.length >= 25 && services.every((item) => !item.live));
  assert.ok(team.length >= 2 && team.every((item) => !item.live));
});
