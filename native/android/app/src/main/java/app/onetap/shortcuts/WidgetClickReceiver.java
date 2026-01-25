package app.onetap.shortcuts;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Handles click events from the Favorites Widget grid items.
 * Launches the appropriate action based on shortcut type.
 */
public class WidgetClickReceiver extends BroadcastReceiver {
    private static final String TAG = "WidgetClickReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!FavoritesWidget.ACTION_WIDGET_CLICK.equals(intent.getAction())) {
            return;
        }

        String shortcutId = intent.getStringExtra(FavoritesWidget.EXTRA_SHORTCUT_ID);
        String shortcutType = intent.getStringExtra(FavoritesWidget.EXTRA_SHORTCUT_TYPE);
        String contentUri = intent.getStringExtra(FavoritesWidget.EXTRA_CONTENT_URI);
        String mimeType = intent.getStringExtra(FavoritesWidget.EXTRA_MIME_TYPE);
        String phoneNumber = intent.getStringExtra(FavoritesWidget.EXTRA_PHONE_NUMBER);
        String messageApp = intent.getStringExtra(FavoritesWidget.EXTRA_MESSAGE_APP);

        Log.d(TAG, "Widget item clicked: id=" + shortcutId + ", type=" + shortcutType + 
            ", uri=" + contentUri + ", phone=" + phoneNumber);

        if (shortcutId == null || shortcutType == null) {
            Log.e(TAG, "Missing shortcut data");
            return;
        }

        // Increment usage count in background
        incrementUsageCount(context, shortcutId);

        // Launch the appropriate action
        try {
            Intent launchIntent = createLaunchIntent(context, shortcutType, contentUri, mimeType, phoneNumber, messageApp);
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(launchIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error launching shortcut: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private Intent createLaunchIntent(Context context, String type, String contentUri, 
            String mimeType, String phoneNumber, String messageApp) {
        
        switch (type) {
            case "link":
                // Open URL in browser or app
                if (contentUri != null && !contentUri.isEmpty()) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(contentUri));
                    return browserIntent;
                }
                break;

            case "file":
                // Open file with appropriate viewer
                if (contentUri != null && !contentUri.isEmpty()) {
                    Uri fileUri = Uri.parse(contentUri);
                    
                    // Check if it's a video
                    if (mimeType != null && mimeType.startsWith("video/")) {
                        Intent videoIntent = new Intent(context, VideoProxyActivity.class);
                        videoIntent.setAction("app.onetap.OPEN_VIDEO");
                        videoIntent.setDataAndType(fileUri, mimeType);
                        videoIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        return videoIntent;
                    }
                    
                    // Check if it's a PDF
                    if (mimeType != null && mimeType.contains("pdf")) {
                        Intent pdfIntent = new Intent(context, PDFProxyActivity.class);
                        pdfIntent.setAction("app.onetap.OPEN_PDF");
                        pdfIntent.setDataAndType(fileUri, mimeType);
                        pdfIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        return pdfIntent;
                    }
                    
                    // Default: open with system viewer
                    Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                    viewIntent.setDataAndType(fileUri, mimeType != null ? mimeType : "*/*");
                    viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    return viewIntent;
                }
                break;

            case "contact":
                // Make phone call
                if (phoneNumber != null && !phoneNumber.isEmpty()) {
                    Intent dialIntent = new Intent(Intent.ACTION_DIAL);
                    dialIntent.setData(Uri.parse("tel:" + phoneNumber));
                    return dialIntent;
                }
                break;

            case "message":
                // Open messaging app
                if (phoneNumber != null && !phoneNumber.isEmpty()) {
                    return createMessageIntent(phoneNumber, messageApp);
                }
                break;
        }

        return null;
    }

    private Intent createMessageIntent(String phoneNumber, String messageApp) {
        if (messageApp == null) {
            // Default to SMS
            Intent smsIntent = new Intent(Intent.ACTION_VIEW);
            smsIntent.setData(Uri.parse("sms:" + phoneNumber));
            return smsIntent;
        }

        switch (messageApp) {
            case "whatsapp":
                // Format phone number for WhatsApp (remove non-digits except +)
                String waNumber = phoneNumber.replaceAll("[^0-9+]", "");
                if (waNumber.startsWith("+")) {
                    waNumber = waNumber.substring(1);
                }
                Intent waIntent = new Intent(Intent.ACTION_VIEW);
                waIntent.setData(Uri.parse("https://wa.me/" + waNumber));
                return waIntent;

            case "telegram":
                Intent tgIntent = new Intent(Intent.ACTION_VIEW);
                tgIntent.setData(Uri.parse("tg://resolve?phone=" + phoneNumber));
                return tgIntent;

            case "signal":
                Intent signalIntent = new Intent(Intent.ACTION_VIEW);
                signalIntent.setData(Uri.parse("sgnl://signal.me/#p/" + phoneNumber));
                return signalIntent;

            default:
                Intent defaultIntent = new Intent(Intent.ACTION_VIEW);
                defaultIntent.setData(Uri.parse("sms:" + phoneNumber));
                return defaultIntent;
        }
    }

    private void incrementUsageCount(Context context, String shortcutId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE);
            String shortcutsJson = prefs.getString("shortcuts", "[]");
            
            JSONArray jsonArray = new JSONArray(shortcutsJson);
            boolean updated = false;
            
            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject obj = jsonArray.getJSONObject(i);
                if (shortcutId.equals(obj.optString("id"))) {
                    int currentCount = obj.optInt("usageCount", 0);
                    obj.put("usageCount", currentCount + 1);
                    updated = true;
                    Log.d(TAG, "Incremented usage count for " + shortcutId + " to " + (currentCount + 1));
                    break;
                }
            }
            
            if (updated) {
                prefs.edit().putString("shortcuts", jsonArray.toString()).apply();
                
                // Refresh widgets to reflect new order
                FavoritesWidget.refreshAllWidgets(context);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error incrementing usage count: " + e.getMessage());
        }
    }
}
