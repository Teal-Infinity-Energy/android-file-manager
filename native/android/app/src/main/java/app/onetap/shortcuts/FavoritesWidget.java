package app.onetap.shortcuts;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import android.util.Log;

/**
 * Favorites Widget (4x2)
 * 
 * Displays the user's most-used shortcuts in a grid layout.
 * Tapping an item launches the associated action directly.
 */
public class FavoritesWidget extends AppWidgetProvider {
    private static final String TAG = "FavoritesWidget";
    public static final String ACTION_WIDGET_CLICK = "app.onetap.WIDGET_ITEM_CLICK";
    public static final String EXTRA_SHORTCUT_ID = "shortcut_id";
    public static final String EXTRA_SHORTCUT_TYPE = "shortcut_type";
    public static final String EXTRA_CONTENT_URI = "content_uri";
    public static final String EXTRA_MIME_TYPE = "mime_type";
    public static final String EXTRA_PHONE_NUMBER = "phone_number";
    public static final String EXTRA_MESSAGE_APP = "message_app";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate called for " + appWidgetIds.length + " widgets");
        
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.d(TAG, "Updating widget " + appWidgetId);
        
        // Get layout IDs
        int layoutId = context.getResources().getIdentifier("widget_favorites", "layout", context.getPackageName());
        int gridViewId = context.getResources().getIdentifier("widget_grid", "id", context.getPackageName());
        int emptyViewId = context.getResources().getIdentifier("widget_empty", "id", context.getPackageName());
        int headerClickId = context.getResources().getIdentifier("widget_header", "id", context.getPackageName());
        
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);
        
        // Set up the RemoteViewsService for the GridView
        Intent serviceIntent = new Intent(context, FavoritesWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        
        views.setRemoteAdapter(gridViewId, serviceIntent);
        views.setEmptyView(gridViewId, emptyViewId);
        
        // Set up click intent template for grid items
        Intent clickIntent = new Intent(context, WidgetClickReceiver.class);
        clickIntent.setAction(ACTION_WIDGET_CLICK);
        clickIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;  // Required for fillInIntent to work
        }
        
        PendingIntent clickPendingIntent = PendingIntent.getBroadcast(
            context, 
            appWidgetId,
            clickIntent, 
            flags
        );
        views.setPendingIntentTemplate(gridViewId, clickPendingIntent);
        
        // Set up header click to open app
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        int headerFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            headerFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent openAppPending = PendingIntent.getActivity(
            context,
            appWidgetId + 1000,  // Different request code
            openAppIntent,
            headerFlags
        );
        views.setOnClickPendingIntent(headerClickId, openAppPending);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
        Log.d(TAG, "Widget " + appWidgetId + " updated with RemoteViewsService");
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        String action = intent.getAction();
        Log.d(TAG, "onReceive: " + action);
        
        // Handle data changed notification
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action) ||
            "app.onetap.WIDGET_DATA_CHANGED".equals(action)) {
            
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName componentName = new ComponentName(context, FavoritesWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
            
            // Notify all widgets that data changed
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, 
                context.getResources().getIdentifier("widget_grid", "id", context.getPackageName()));
            
            Log.d(TAG, "Notified " + appWidgetIds.length + " widgets of data change");
        }
    }

    @Override
    public void onEnabled(Context context) {
        Log.d(TAG, "First Favorites widget added");
    }

    @Override
    public void onDisabled(Context context) {
        Log.d(TAG, "Last Favorites widget removed");
    }
    
    /**
     * Static method to refresh all Favorites widgets
     */
    public static void refreshAllWidgets(Context context) {
        Intent intent = new Intent(context, FavoritesWidget.class);
        intent.setAction("app.onetap.WIDGET_DATA_CHANGED");
        context.sendBroadcast(intent);
    }
}
