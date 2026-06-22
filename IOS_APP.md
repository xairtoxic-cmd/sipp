# Shipping Sipp to the iOS App Store

Sipp is wrapped as a native iOS app with **Capacitor**. The native shell loads
`https://joinsipp.com` and adds a native launch screen, app icon, status-bar
styling, and (later) push notifications. You build & submit entirely from the
cloud with **Codemagic** — no Mac needed.

## What's already set up in this repo
- `capacitor.config.json` — app id `com.joinsipp.app`, name **Sipp**, loads the live site.
- `mobile/index.html` — offline fallback screen.
- `resources/icon.png` (1024²) + `resources/splash.png` (2732²) — branded icon & splash.
- `src/components/CapacitorInit.jsx` — hides the splash & styles the status bar in the app.
- `codemagic.yaml` — the cloud build pipeline (generates the iOS project, icons, signs, builds, ships to TestFlight).

## One-time accounts
1. **Apple Developer Program** — enroll at developer.apple.com ($99/yr). Required.
2. **Codemagic** — sign up at codemagic.io (free tier covers this), connect your GitHub repo `xairtoxic-cmd/sipp`.

## Codemagic setup (UI)
1. **App Store Connect API key:** App Store Connect → Users and Access → Integrations → generate an API key (Admin/App Manager). Download the `.p8`, note the **Issuer ID** and **Key ID**.
2. In Codemagic → **Teams → Integrations → Developer Portal**, add that key. Name it exactly **`Sipp ASC Key`** (matches `codemagic.yaml`), or rename it in the yaml.
3. Codemagic → your app → **Settings → Code signing (iOS)** → choose **Automatic** with the App Store Connect integration. Bundle id: `com.joinsipp.app`.
4. Pick the **`ios-sipp`** workflow (from `codemagic.yaml`) and **Start build**.

The build will: install deps → generate the iOS project → render icons/splash → sign → build the `.ipa` → upload to **TestFlight**.

## App Store Connect
1. Create the app: My Apps → **+** → New App. Platform iOS, name **Sipp**, bundle id `com.joinsipp.app`, primary language, SKU (any unique string).
2. Fill in: category (Food & Drink / Travel), description, keywords, support URL (`https://joinsipp.com`), privacy policy URL.
3. Upload **screenshots** (6.7" and 5.5" required — take them from TestFlight on a device/simulator).
4. **App Privacy** — declare data collected (email, name, photos, coarse location, usage). Sipp uses Supabase auth + Resend emails; disclose accordingly.
5. Once the TestFlight build is processed, attach it to a version and **Submit for Review**.

## Known follow-ups (not blockers for a first TestFlight build)
- **Google sign-in:** Google blocks OAuth inside plain web views. In the app, **email + password + the email code** works today. Native "Continue with Google" needs the system browser flow (Capacitor Browser + a deep link back to the app) — a focused add when you want it. Email/password is fine for launch.
- **Push notifications:** the `@capacitor/push-notifications` plugin is installed. To go live you'll need an **APNs key** (Apple Developer → Keys), a Push capability on the app id, a device-token table, and a server sender. This upgrades the like/comment **emails** into native pushes for better retention. Say the word and I'll wire it up.
- **App Review guideline 4.2:** because the app loads a website, lean on its real device features (photo upload, location, share) and add push to clearly position it as an app, not a bookmark.

## Updating the app later
Just push to `main` as usual (the website updates instantly since the app loads it live). You only need a **new Codemagic build + submission** when you change the native shell (icon, splash, plugins, permissions) or to bump the version for the store.
