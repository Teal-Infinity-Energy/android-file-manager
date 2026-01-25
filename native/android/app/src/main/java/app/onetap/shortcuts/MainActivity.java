package app.onetap.shortcuts;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import app.onetap.shortcuts.plugins.ShortcutPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    public static final String ACTION_QUICK_CREATE = "app.onetap.QUICK_CREATE";
    
    // Flag to indicate app was launched from Quick Create widget
    private boolean pendingQuickCreate = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the ShortcutPlugin BEFORE calling super.onCreate()
        registerPlugin(ShortcutPlugin.class);
        super.onCreate(savedInstanceState);
        
        Log.d(TAG, "onCreate called");
        logIntent(getIntent());
        
        // Check for Quick Create widget action
        handleQuickCreateIntent(getIntent());
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        Log.d(TAG, "onNewIntent called");
        logIntent(intent);
        
        // CRITICAL: Update the stored intent so getIntent() returns the new one
        // This is essential for Share Sheet to work when app is already open
        setIntent(intent);
        
        // Check for Quick Create widget action
        handleQuickCreateIntent(intent);
        
        // Notify Capacitor bridge about the new intent
        if (bridge != null) {
            bridge.onNewIntent(intent);
            Log.d(TAG, "Notified bridge of new intent");
        }
    }
    
    /**
     * Handle Quick Create widget action
     */
    private void handleQuickCreateIntent(Intent intent) {
        if (intent != null && ACTION_QUICK_CREATE.equals(intent.getAction())) {
            Log.d(TAG, "Quick Create widget action detected");
            pendingQuickCreate = true;
            // The JS side will check for this via getSharedContent
        }
    }
    
    /**
     * Check if there's a pending Quick Create action
     */
    public boolean hasPendingQuickCreate() {
        return pendingQuickCreate;
    }
    
    /**
     * Clear the pending Quick Create flag
     */
    public void clearPendingQuickCreate() {
        pendingQuickCreate = false;
    }
    
    private void logIntent(Intent intent) {
        if (intent == null) {
            Log.d(TAG, "Intent is null");
            return;
        }
        
        String action = intent.getAction();
        String type = intent.getType();
        String data = intent.getDataString();
        
        Log.d(TAG, "Intent - action: " + action + ", type: " + type + ", data: " + data);
        
        if (Intent.ACTION_SEND.equals(action)) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            Log.d(TAG, "ACTION_SEND - text extra: " + text);
        }
    }
}
