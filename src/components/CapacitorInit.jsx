"use client";

import { useEffect } from "react";

// No-op on the web. Inside the native iOS shell it styles the status bar and
// hides the launch splash once the web app has loaded.
export default function CapacitorInit() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor?.isNativePlatform?.()) return;
        document.documentElement.classList.add("is-native");
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Light }); // dark text on our cream UI
        } catch {}
        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          setTimeout(() => { if (!cancelled) SplashScreen.hide().catch(() => {}); }, 500);
        } catch {}
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
  return null;
}
