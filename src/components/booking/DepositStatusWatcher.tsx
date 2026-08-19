"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Square redirects the client back to the confirmation page immediately after
 * checkout, but the payment webhook may land a second or two later. Without
 * this, the page keeps showing "Almost there." even though the deposit has
 * settled, and the client thinks the payment failed.
 *
 * Polls a few times on return, then stops. Silent when nothing is pending.
 */
export function DepositStatusWatcher({
  awaitingDeposit,
}: {
  awaitingDeposit: boolean;
}) {
  const router = useRouter();
  const attempts = useRef(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!awaitingDeposit) return;

    // Only poll when the client has plausibly just come back from Square.
    // The Square checkout redirect appends ?payment=return, which is the
    // reliable signal that the client has just completed checkout.
    const params = new URLSearchParams(window.location.search);
    const returned = params.get("payment") === "return";

    // Poll on return, and also once on a normal load in case the webhook
    // arrived while the page was rendering.
    const maxAttempts = returned ? 40 : 4;
    const intervalMs = returned ? 1500 : 4000;

    setChecking(true);
    const timer = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > maxAttempts) {
        clearInterval(timer);
        setChecking(false);
        return;
      }
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [awaitingDeposit, router]);

  if (!awaitingDeposit || !checking) return null;

  return (
    <p className="mt-4 text-xs text-[var(--color-bone-muted)]">
      Already paid? Checking for your payment…{" "}
      <button
        type="button"
        onClick={() => router.refresh()}
        className="text-[var(--color-brass)] underline underline-offset-4"
      >
        Refresh now
      </button>
    </p>
  );
}
