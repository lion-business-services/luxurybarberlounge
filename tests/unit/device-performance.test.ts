import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMotionTier,
  isOperationalRoute,
  shouldUseCustomCursor,
  shouldUseSmoothScroll,
  type DevicePerformanceSignals,
} from "../../src/lib/motion/devicePerformance.ts";

const capableDesktop: DevicePerformanceSignals = {
  width: 1920,
  height: 1080,
  reducedMotion: false,
  saveData: false,
  effectiveType: "4g",
  finePointer: true,
  touch: false,
  deviceMemory: 16,
  hardwareConcurrency: 12,
};

test("high-capability desktop receives the full public motion tier", () => {
  assert.equal(classifyMotionTier(capableDesktop), "high");
  assert.equal(shouldUseSmoothScroll("high", "/"), true);
  assert.equal(shouldUseCustomCursor("high", "/services"), true);
});

test("standard laptops avoid the permanent smooth-scroll and cursor loops", () => {
  const tier = classifyMotionTier({
    ...capableDesktop,
    width: 1366,
    deviceMemory: 4,
    hardwareConcurrency: 4,
  });
  assert.equal(tier, "standard");
  assert.equal(shouldUseSmoothScroll(tier, "/"), false);
  assert.equal(shouldUseCustomCursor(tier, "/"), false);
});

test("touch, mobile, reduced-motion, and data-saver signals select conservative tiers", () => {
  assert.equal(classifyMotionTier({ ...capableDesktop, width: 390, finePointer: false, touch: true }), "mobile");
  assert.equal(classifyMotionTier({ ...capableDesktop, width: 820, finePointer: false, touch: true }), "tablet");
  assert.equal(classifyMotionTier({ ...capableDesktop, reducedMotion: true }), "minimal");
  assert.equal(classifyMotionTier({ ...capableDesktop, saveData: true }), "minimal");
  assert.equal(classifyMotionTier({ ...capableDesktop, deviceMemory: 2 }), "minimal");
});

test("operational routes never receive cinematic cursor or smooth scrolling", () => {
  for (const pathname of ["/client", "/barber/today", "/reception/queue", "/admin", "/kiosk/check-in"]) {
    assert.equal(isOperationalRoute(pathname), true, pathname);
    assert.equal(shouldUseSmoothScroll("high", pathname), false, pathname);
    assert.equal(shouldUseCustomCursor("high", pathname), false, pathname);
  }
  assert.equal(isOperationalRoute("/barbers/ruben-diaz-jr"), false);
});
