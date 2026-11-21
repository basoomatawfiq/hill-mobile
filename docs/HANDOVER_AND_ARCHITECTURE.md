# HILL MOBILE — Architecture, Operations & Handover Guide

## 1. System Architecture Overview

```
+-------------------------------------------------------------------+
|               HILL MOBILE PWA (React + TypeScript + Vite)         |
|  - 14 Screens (Home, Live TV, Library, Details, Player, Admin...) |
|  - Official YouTube IFrame Player API (no stream extraction)      |
|  - Workbox Service Worker + Web Push Listener (/push-sw.js)       |
|  - Firebase Client SDK (Firestore Public Reads + Admin Auth)      |
+--------------------+--------------------------+-------------------+
                     | HTTPS / REST             | HTTPS / SDK
                     v                          v
+--------------------+----------+   +-----------+-------------------+
| Node.js Express Backend       |   | Firebase Cloud Platform       |
| (server.ts, Port 3000)        |   | - Firebase Auth (Google Admin)|
| - /api/youtube/* (60s/5m cache|   | - Cloud Firestore (7 collections|
|   + retry + quota protection) |   |   secured by firestore.rules) |
| - /api/notifications/* (VAPID)|   +-------------------------------+
| - /api/admin/* (ID Token Auth)|
+--------------------+----------+
                     | Server-side YOUTUBE_API_KEY
                     v
+--------------------+----------+
| YouTube Data API v3           |
| @samiwabasriugandatrueislam688|
+-------------------------------+
```

## 2. Firestore Collections (`firebase-blueprint.json`)
- `/administrators/{adminId}` — Authorized administrators (PII protected; owner email bootstrapped).
- `/categories/{categoryId}` — Programme categories (public read, admin write).
- `/programmes/{programmeId}` — Synchronized/categorized video metadata (public read, admin write).
- `/featured_programmes/{featuredId}` — Home featured slots (public read, admin write).
- `/notifications/{notificationId}` — Live alerts & station announcements (public read, admin create/delete).
- `/app_settings/public` — About HILL, Contact email/phone/location (public read, admin write).
- `/audit_logs/{logId}` — Immutable admin & sync audit trail (admin read/create, update/delete denied).

## 3. Backend API Endpoints (`server.ts`)
- `GET /api/health` — Server status, YouTube configuration status (boolean only), push subscriber count.
- `GET /api/youtube/live` — Server-cached (60s) active live & upcoming broadcast status for `@samiwabasriugandatrueislam688`.
- `GET /api/youtube/videos?pageToken=&maxResults=&q=` — Server-cached (5m) public recorded uploads sorted newest first.
- `GET /api/youtube/video/:videoId` — Live availability & metadata verification for a single video.
- `GET /api/notifications/vapid-key` — Public VAPID key for browser PushManager subscription.
- `POST /api/notifications/subscribe` / `POST /api/notifications/unsubscribe` — Manage browser push endpoints.
- `GET /api/admin/status` — Admin diagnostics (requires Firebase ID token Bearer header).
- `POST /api/admin/sync` — Clears YouTube caches and forces live + uploads refresh (requires Admin Bearer token).
- `POST /api/admin/notifications/broadcast` — Sends Web Push notification to all subscribed browsers (requires Admin Bearer token).

## 4. Required External Secrets Setup (YouTube Data API v3)
1. Open Google Cloud Console → APIs & Services → Library → Enable **YouTube Data API v3**.
2. Create an **API Key** under Credentials (restrict to YouTube Data API v3).
3. In Google AI Studio Secrets (or Cloud Run environment variables), set:
   - `YOUTUBE_API_KEY` = your YouTube Data API v3 key.
   - `YOUTUBE_CHANNEL_HANDLE` = `@samiwabasriugandatrueislam688` (default).
   - Optional: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` for persistent Web Push keys across Cloud Run container instances.

## 5. Security Audit Summary
- **Viewer Privacy**: Viewers require zero sign-in, zero accounts, and zero payments.
- **Secret Isolation**: `YOUTUBE_API_KEY` and `VAPID_PRIVATE_KEY` exist only in `server.ts` / `src/server/*` and are never bundled into `dist/assets/`.
- **Admin RBAC**: Admin routes verify Firebase ID tokens via `firebase-admin/auth` (`verifyIdToken`) with `email_verified === true`; Firestore rules enforce all Eight Pillars (`isValidId`, strict `hasAll`/`hasOnly`, `request.time` server timestamps, immutable `audit_logs`, and verified admin email/record checks) and passed `@firebase/eslint-plugin-security-rules` with 0 errors.
- **YouTube Policy Compliance**: Uses official YouTube Data API v3 and official YouTube IFrame Player API; preserves YouTube controls, branding, and ads; never extracts raw video streams; never autoplays recorded programmes.

## 6. Push Notification Compatibility
- **Android Chrome / Edge / Desktop**: Supported directly over HTTPS.
- **iPhone / iPad (iOS 16.4+)**: Viewers must first tap Safari **Share → Add to Home Screen** and launch the installed HILL MOBILE PWA before enabling notifications.

## 7. Android & iOS Store Packaging Path
- **Android (Google Play)**: Package the deployed HTTPS Cloud Run URL as a **Trusted Web Activity (TWA)** using Bubblewrap (`npx @bubblewrap/cli init --manifest https://<your-app-url>/manifest.webmanifest`) or Capacitor Android (`@capacitor/android`), using package ID e.g. `org.hillmobile.app`, 512x512 icon, and signed `.aab` Android App Bundle via Play App Signing.
- **iOS (Apple App Store)**: Because Google AI Studio builds web/PWA apps, iOS App Store distribution requires macOS + Xcode (local Mac or cloud CI such as Xcode Cloud / Codemagic). Wrap the project with Capacitor (`@capacitor/ios`) or a native Swift `WKWebView` / YouTube iOS Player Helper wrapper, configure Bundle ID `org.hillmobile.app`, attach the 1024x1024 AppIcon, declare Privacy Policy URL, and ensure compliance with Apple App Store Review Guidelines (Section 4.2 Minimum Functionality & native navigation/push integration).
