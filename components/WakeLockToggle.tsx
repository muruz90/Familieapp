"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "familie-hold-skaerm";

/** Holder skærmen tændt, mens man laver mad. Valget huskes på enheden til næste opskrift. */
export default function WakeLockToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const lock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    setSupported(true);
    try {
      if (localStorage.getItem(KEY) === "1") setOn(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const acquire = async () => {
      if (!on || document.visibilityState !== "visible" || (lock.current && !lock.current.released)) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) sentinel.release();
        else lock.current = sentinel;
      } catch {}
    };
    // Låsen slippes automatisk, når man skifter app; den hentes igen, når man kommer tilbage.
    const onVisible = () => void acquire();
    if (on) void acquire();
    else lock.current?.release().catch(() => {});
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock.current?.release().catch(() => {});
      lock.current = null;
    };
  }, [on, supported]);

  if (!supported) return null;

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
  };

  return (
    <label className="check" style={{ margin: "0 0 1rem" }}>
      <input type="checkbox" checked={on} onChange={toggle} /> 🔆 Hold skærmen tændt
    </label>
  );
}
