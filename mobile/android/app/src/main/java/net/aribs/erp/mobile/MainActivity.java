package net.aribs.erp.mobile;

import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "ARIBS-ERP-Update";

    // Same GitHub repo the Windows app publishes its releases to (see
    // erp-desktop-app's package.json "publish" config and its GitHub
    // Actions workflow) - the Android APK is released as an extra asset on
    // the SAME tagged release, so both apps' auto-update checks point here.
    private static final String LATEST_RELEASE_API =
        "https://api.github.com/repos/aribspeat-Rawahi/Aribs-Erp/releases/latest";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        checkForUpdateInBackground();
    }

    // There is no Play Store here (this APK is side-loaded, by design - no
    // Google Play account/fee needed), so Android's own in-store update
    // mechanism doesn't apply. This does the same job by hand: on every
    // app start, quietly ask GitHub what the latest released version is,
    // and if it's newer than what's installed, show a popup offering to
    // open that release's download page. This NEVER touches the backend
    // or any ERP data - it only ever offers a newer copy of this app.
    private void checkForUpdateInBackground() {
        new Thread(() -> {
            try {
                String currentVersion = getPackageManager()
                    .getPackageInfo(getPackageName(), 0).versionName;

                URL url = new URL(LATEST_RELEASE_API);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("Accept", "application/vnd.github+json");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) body.append(line);
                }

                JSONObject json = new JSONObject(body.toString());
                String tagName = json.optString("tag_name", ""); // e.g. "v1.0.1"
                String htmlUrl = json.optString("html_url", "");
                String latestVersion = tagName.startsWith("v") ? tagName.substring(1) : tagName;

                if (!latestVersion.isEmpty() && isNewer(latestVersion, currentVersion)) {
                    runOnUiThread(() -> showUpdateDialog(latestVersion, htmlUrl));
                }
            } catch (Exception e) {
                // No internet yet, GitHub unreachable, first release not
                // published yet, etc. - never interrupts the app for this.
                Log.w(TAG, "Update check failed (non-fatal): " + e.getMessage());
            }
        }).start();
    }

    // Simple numeric version comparison ("1.2.10" > "1.2.9"), good enough
    // for plain "MAJOR.MINOR.PATCH" tags like this project uses.
    private boolean isNewer(String latest, String current) {
        String[] a = latest.split("\\.");
        String[] b = current.split("\\.");
        int len = Math.max(a.length, b.length);
        for (int i = 0; i < len; i++) {
            int x = i < a.length ? parsePart(a[i]) : 0;
            int y = i < b.length ? parsePart(b[i]) : 0;
            if (x != y) return x > y;
        }
        return false;
    }

    private int parsePart(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private void showUpdateDialog(String latestVersion, String releaseUrl) {
        if (isFinishing()) return;
        new AlertDialog.Builder(this)
            .setTitle("Update available")
            .setMessage("Version " + latestVersion + " is available. This only replaces the "
                + "app itself - your ERP data on the server is never affected. Open the "
                + "download page now?")
            .setPositiveButton("Download", (dialog, which) -> {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(releaseUrl));
                startActivity(intent);
            })
            .setNegativeButton("Later", null)
            .show();
    }
}
