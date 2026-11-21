# Creating & Sharing the HILL MOBILE Android APK

Because this workspace runs in a cloud web sandbox without Java JDK, Gradle, or the Android SDK installed, an `.apk` binary cannot be compiled directly inside AI Studio.

**Important URL Note:** The AI Studio preview/share link (`ais-pre-...run.app`) has a Google AI Studio login/cookie redirect (`/__cookie_check.html`). Before generating an APK for public Android users, **deploy HILL MOBILE to Google Cloud Run** (using **Deploy to Cloud Run** in AI Studio) so you get a public, unauthenticated `https://your-service.run.app` URL.

---

## Option 1: Build a Shareable APK `.zip` via GitHub Actions (Works Even When PWABuilder Is Down)

1. Export/push this project to a GitHub repository.
2. Open the repository on GitHub → click the **Actions** tab → select **Build HILL MOBILE Android APK (ZIP)**.
3. Click **Run workflow**, paste your **public Cloud Run HTTPS URL** (e.g. `https://hill-mobile-xxxx.run.app`), and click **Run workflow**.
4. Wait ~2 minutes, then download the **`hill-mobile-android-apk.zip`** artifact (it contains `HILL-MOBILE.apk` and `SHA256_FINGERPRINT.txt`).
5. *(Optional, for fullscreen with no browser bar)*: Copy the `XX:XX:...` fingerprint from `SHA256_FINGERPRINT.txt` into AI Studio / Cloud Run environment variables as `ANDROID_SHA256_FINGERPRINTS` and redeploy.

---

## Option 2: Build Locally on Windows / Mac / Linux with Bubblewrap CLI

If you have Node.js installed on your computer, you do **not** need PWABuilder's website:

```bash
npx @bubblewrap/cli init --manifest https://YOUR-CLOUD-RUN-URL/manifest.webmanifest
npx @bubblewrap/cli build
```

Bubblewrap automatically sets up the Android SDK & JDK, generates your signing key, and outputs **`app-release-signed.apk`** in your folder ready to share.

---

## Option 3: Instant Android Install Without an APK File

Once deployed on Cloud Run, share your `https://your-service.run.app` link directly:
- Users open the link in **Chrome** on Android and tap **Install App** (or **⋮ → Install app**).
- Chrome installs **HILL MOBILE** directly onto their home screen with the **HILL** logo, fullscreen view, and Web Push live alerts.
