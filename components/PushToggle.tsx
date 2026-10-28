"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/actions";

type Status = "loading" | "unsupported" | "ios-home" | "denied" | "off" | "on";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus(ios && !standalone ? "ios-home" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub) await savePushSubscription(sub.toJSON()); // holder serveren opdateret, også efter login som en anden
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      await savePushSubscription(sub.toJSON());
      setStatus("on");
    } catch {
      setMsg("Det lykkedes ikke at slå notifikationer til. Prøv igen.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("off");
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    await sendTestPush();
    setMsg("Testbesked sendt. Den kommer om et øjeblik.");
    setBusy(false);
  }

  return (
    <section className="card">
      <h2>Notifikationer</h2>
      {status === "loading" && <p className="muted">Tjekker …</p>}
      {status === "ios-home" && (
        <p className="muted">
          På iPhone og iPad virker notifikationer kun, når appen er lagt på hjemmeskærmen: tryk på Del-knappen i Safari og vælg
          &quot;Føj til hjemmeskærm&quot;. Åbn så appen derfra og kom tilbage hertil.
        </p>
      )}
      {status === "unsupported" && <p className="muted">Denne browser kan ikke vise notifikationer.</p>}
      {status === "denied" && (
        <p className="muted">Notifikationer er blokeret for appen. Slå dem til i telefonens indstillinger under Notifikationer → Familie.</p>
      )}
      {status === "off" && (
        <>
          <p className="muted">Få besked om nye opgaver, godkendelser, lommepenge og aftaler på denne enhed.</p>
          <button className="btn" disabled={busy} onClick={turnOn}>
            Slå notifikationer til
          </button>
        </>
      )}
      {status === "on" && (
        <>
          <p className="muted">Notifikationer er slået til på denne enhed.</p>
          <div className="row">
            <button className="btn" disabled={busy} onClick={test}>
              Send en test
            </button>
            <button className="btn secondary" disabled={busy} onClick={turnOff}>
              Slå fra
            </button>
          </div>
        </>
      )}
      {msg && <p className="muted">{msg}</p>}
    </section>
  );
}
