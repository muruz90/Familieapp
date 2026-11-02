"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Henter siden igen med jævne mellemrum, så flere telefoner ser de samme flueben. Kun mens siden er synlig. */
export default function LiveRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
