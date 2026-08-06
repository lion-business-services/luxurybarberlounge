import test from "node:test";
import assert from "node:assert/strict";
import { DevelopmentBookingProvider } from "../../src/lib/booking/development.ts";


test("development booking provider mirrors the confirmed non-live catalog and schedules", async () => {
  const provider = new DevelopmentBookingProvider();
  const [locations, services, team, designTeam] = await Promise.all([
    provider.listLocations(),
    provider.listServices(),
    provider.listTeamMembers(),
    provider.listTeamMembers(undefined, "design"),
  ]);
  assert.equal(provider.mode, "development");
  assert.ok(locations.length > 0 && locations.every((item) => !item.live));
  assert.equal(services.length, 9);
  assert.ok(services.every((item) => !item.live && item.depositCents === item.priceCents / 2));
  assert.equal(team.length, 7, "Barber Lo's remains unavailable online until working days are confirmed");
  assert.ok(team.every((item) => !item.live));
  assert.deepEqual(designTeam, []);
});
