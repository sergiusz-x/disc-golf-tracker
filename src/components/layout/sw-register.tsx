"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        if (process.env.NODE_ENV !== "production") {
            void navigator.serviceWorker.getRegistrations().then((registrations) => {
                void Promise.all(registrations.map((registration) => registration.unregister()));
            });
            if (typeof caches !== "undefined") {
                void caches.keys().then((keys) => {
                    void Promise.all(keys.map((key) => caches.delete(key)));
                });
            }
            return;
        }

        const onLoad = () => {
            void navigator.serviceWorker.register("/sw.js").catch(() => {
                // PWA should fail open if registration is unavailable.
            });
        };

        if (document.readyState === "complete") {
            onLoad();
            return;
        }

        window.addEventListener("load", onLoad, { once: true });
        return () => window.removeEventListener("load", onLoad);
    }, []);

    return null;
}
