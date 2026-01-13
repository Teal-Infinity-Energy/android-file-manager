package app.onetap.shortcuts;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

/**
 * PdfProxyActivity is a transparent, no-history activity that handles taps on PDF shortcuts.
 * 
 * When a PDF shortcut is tapped, this activity:
 * 1. Receives the intent with the PDF URI and shortcut ID
 * 2. Grants necessary URI permissions
 * 3. Launches the internal NativePdfViewerActivity
 * 
 * The activity itself is invisible and finishes immediately after launching the PDF viewer.
 */
public class PdfProxyActivity extends Activity {
    
    private static final String TAG = "PdfProxyActivity";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent intent = getIntent();
        if (intent == null) {
            Log.e(TAG, "No intent received");
            finish();
            return;
        }
        
        Uri pdfUri = intent.getData();
        String mimeType = intent.getType();
        String shortcutId = intent.getStringExtra("shortcut_id");
        
        Log.d(TAG, "Received PDF intent: uri=" + pdfUri + ", type=" + mimeType + ", shortcutId=" + shortcutId);
        
        if (pdfUri == null) {
            Log.e(TAG, "No PDF URI in intent");
            finish();
            return;
        }
        
        // Launch the internal PDF viewer
        openInternalPdfViewer(pdfUri, mimeType, shortcutId);
        
        // Finish immediately - we don't need to stay in the task
        finish();
    }
    
    private void openInternalPdfViewer(Uri pdfUri, String mimeType, String shortcutId) {
        try {
            Intent viewerIntent = new Intent(this, NativePdfViewerActivity.class);
            viewerIntent.setAction(Intent.ACTION_VIEW);
            viewerIntent.setDataAndType(pdfUri, mimeType != null ? mimeType : "application/pdf");
            viewerIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            viewerIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            // Pass shortcut ID for page tracking
            if (shortcutId != null) {
                viewerIntent.putExtra("shortcut_id", shortcutId);
            }
            
            // Set ClipData for better URI permission propagation
            if ("content".equals(pdfUri.getScheme())) {
                try {
                    viewerIntent.setClipData(android.content.ClipData.newUri(
                        getContentResolver(), "onetap-pdf", pdfUri));
                } catch (Exception e) {
                    Log.w(TAG, "Failed to set ClipData: " + e.getMessage());
                }
            }
            
            startActivity(viewerIntent);
            Log.d(TAG, "Successfully launched NativePdfViewerActivity");
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch PDF viewer: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
