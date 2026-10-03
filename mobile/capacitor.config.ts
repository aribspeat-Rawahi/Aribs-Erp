import type { CapacitorConfig } from '@capacitor/cli';

// "Live URL mode": the app opens the real ERP website instead of carrying
// its own copy of the frontend. Every server deploy reaches the app
// instantly - no APK rebuild needed for ERP changes.
//
// The address is chosen at build time:
//   production (default): https://erp.aribs.net
//   staging test build:   ERP_SERVER_URL=https://staging-erp.aribs.net npx cap sync android
const serverUrl = (process.env.ERP_SERVER_URL || 'https://erp.aribs.net').replace(/\/+$/, '');
const serverHost = new URL(serverUrl).host;

const config: CapacitorConfig = {
  appId: 'net.aribs.erp.mobile',
  appName: 'ARIBS ERP',
  // Only holds the small offline page now (shown when there's no internet).
  webDir: 'www',
  server: {
    url: serverUrl,
    // Only our own site may load inside the app; any other link (WhatsApp,
    // maps, ...) is handed to the phone's own apps/browser.
    allowNavigation: [serverHost],
    cleartext: false,
    errorPath: 'offline.html',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
