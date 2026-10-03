# ARIBS ERP – Windows & Android apps

Both apps run in **live URL mode**: they open the ERP website
(`https://erp.aribs.net`) inside a native window. Every update deployed to
the server appears in the apps immediately — **no rebuild or reinstall is
needed for ERP changes**.

The ERP itself (backend + frontend) lives in the private
`aribs-erp-server` repository.

```
desktop/   Electron Windows app (NSIS installer, auto-update)
mobile/    Capacitor Android app (signed APK, update prompt)
```

## When do the apps need a new build?

Only when the app shell itself changes: icon, app version, native
plugins (PDF viewer, share), or the server address.

## Release (production)

1. Bump `version` in `desktop/package.json`
2. Bump `versionCode` (+1) and `versionName` in `mobile/android/app/build.gradle`
3. Commit and push to `main`
4. GitHub → **Actions → Build apps → Run workflow** → mode **release**
   (pushing a tag like `v1.1.1` also works)

GitHub Actions builds both apps and publishes them on one GitHub Release
tagged `v<version>`.
The installed apps detect it and offer the update.

## Test build (staging)

GitHub → **Actions → Build apps → Run workflow** → mode **test** (server URL
defaults to the staging site). Download links appear on the
**staging-test** pre-release, which the apps' updaters ignore.

## Android signing

The APK is signed with the release keystore, provided to the workflow via
four repository secrets: `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

The keystore file and its passwords must **never** be committed. Keep a
backup outside GitHub — losing it means users must uninstall/reinstall to
get updates.
