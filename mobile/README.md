# ARIBS ERP — Android app

A Capacitor app in **live URL mode**: it opens `https://erp.aribs.net`
inside a native WebView (see `capacitor.config.ts`). ERP updates reach the
app as soon as they're deployed to the server — no new APK needed.

Native features compiled into the APK:
- `@capacitor/filesystem`, `@capacitor-community/file-opener` — open
  invoice/quotation PDFs in the phone's PDF viewer
- `@capacitor/share` — share the real PDF file (WhatsApp, Drive, …)
- `MainActivity.java` — on launch, checks GitHub Releases and offers new
  app versions (no Play Store)

`www/` only holds `offline.html` (shown when there's no internet).

Builds are done by GitHub Actions (see the root README). For a local
staging build: `npm ci && npm run sync:staging`, then build in Android
Studio.
