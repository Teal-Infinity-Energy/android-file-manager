package app.onetap.shortcuts;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.RectF;
import android.util.Base64;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * RemoteViewsService that provides data for the Favorites Widget GridView.
 * Reads shortcuts from SharedPreferences and sorts by usage count.
 */
public class FavoritesWidgetService extends RemoteViewsService {
    private static final String TAG = "FavoritesWidgetService";

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new FavoritesRemoteViewsFactory(getApplicationContext(), intent);
    }

    private static class FavoritesRemoteViewsFactory implements RemoteViewsFactory {
        private Context context;
        private int appWidgetId;
        private List<ShortcutItem> shortcuts = new ArrayList<>();
        
        // Maximum number of shortcuts to show in widget
        private static final int MAX_SHORTCUTS = 8;

        FavoritesRemoteViewsFactory(Context context, Intent intent) {
            this.context = context;
            this.appWidgetId = intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID, 
                AppWidgetManager.INVALID_APPWIDGET_ID
            );
            Log.d(TAG, "Factory created for widget " + appWidgetId);
        }

        @Override
        public void onCreate() {
            Log.d(TAG, "onCreate");
            loadShortcuts();
        }

        @Override
        public void onDataSetChanged() {
            Log.d(TAG, "onDataSetChanged - reloading shortcuts");
            loadShortcuts();
        }

        private void loadShortcuts() {
            shortcuts.clear();
            
            try {
                SharedPreferences prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE);
                String shortcutsJson = prefs.getString("shortcuts", "[]");
                
                Log.d(TAG, "Loading shortcuts from SharedPreferences, length: " + shortcutsJson.length());
                
                JSONArray jsonArray = new JSONArray(shortcutsJson);
                List<ShortcutItem> allShortcuts = new ArrayList<>();
                
                for (int i = 0; i < jsonArray.length(); i++) {
                    JSONObject obj = jsonArray.getJSONObject(i);
                    ShortcutItem item = new ShortcutItem();
                    item.id = obj.optString("id", "");
                    item.name = obj.optString("name", "Shortcut");
                    item.type = obj.optString("type", "link");
                    item.contentUri = obj.optString("contentUri", "");
                    item.usageCount = obj.optInt("usageCount", 0);
                    item.mimeType = obj.optString("mimeType", null);
                    item.phoneNumber = obj.optString("phoneNumber", null);
                    item.messageApp = obj.optString("messageApp", null);
                    
                    // Parse icon
                    JSONObject iconObj = obj.optJSONObject("icon");
                    if (iconObj != null) {
                        item.iconType = iconObj.optString("type", "text");
                        item.iconValue = iconObj.optString("value", "");
                    }
                    
                    allShortcuts.add(item);
                }
                
                // Sort by usage count (descending)
                Collections.sort(allShortcuts, new Comparator<ShortcutItem>() {
                    @Override
                    public int compare(ShortcutItem a, ShortcutItem b) {
                        return Integer.compare(b.usageCount, a.usageCount);
                    }
                });
                
                // Take top N shortcuts
                int count = Math.min(allShortcuts.size(), MAX_SHORTCUTS);
                for (int i = 0; i < count; i++) {
                    shortcuts.add(allShortcuts.get(i));
                }
                
                Log.d(TAG, "Loaded " + shortcuts.size() + " shortcuts for widget");
                
            } catch (Exception e) {
                Log.e(TAG, "Error loading shortcuts: " + e.getMessage());
                e.printStackTrace();
            }
        }

        @Override
        public void onDestroy() {
            shortcuts.clear();
        }

        @Override
        public int getCount() {
            return shortcuts.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position >= shortcuts.size()) {
                return null;
            }
            
            ShortcutItem item = shortcuts.get(position);
            
            int layoutId = context.getResources().getIdentifier(
                "widget_favorite_item", "layout", context.getPackageName());
            int iconViewId = context.getResources().getIdentifier(
                "item_icon", "id", context.getPackageName());
            int labelViewId = context.getResources().getIdentifier(
                "item_label", "id", context.getPackageName());
            
            RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);
            
            // Set label
            views.setTextViewText(labelViewId, item.name);
            
            // Set icon based on type
            Bitmap iconBitmap = createIconBitmap(item);
            if (iconBitmap != null) {
                views.setImageViewBitmap(iconViewId, iconBitmap);
            }
            
            // Set up fill-in intent for click handling
            Intent fillInIntent = new Intent();
            fillInIntent.putExtra(FavoritesWidget.EXTRA_SHORTCUT_ID, item.id);
            fillInIntent.putExtra(FavoritesWidget.EXTRA_SHORTCUT_TYPE, item.type);
            fillInIntent.putExtra(FavoritesWidget.EXTRA_CONTENT_URI, item.contentUri);
            fillInIntent.putExtra(FavoritesWidget.EXTRA_MIME_TYPE, item.mimeType);
            fillInIntent.putExtra(FavoritesWidget.EXTRA_PHONE_NUMBER, item.phoneNumber);
            fillInIntent.putExtra(FavoritesWidget.EXTRA_MESSAGE_APP, item.messageApp);
            
            views.setOnClickFillInIntent(
                context.getResources().getIdentifier("item_container", "id", context.getPackageName()),
                fillInIntent
            );
            
            return views;
        }
        
        private Bitmap createIconBitmap(ShortcutItem item) {
            int size = 144;
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            
            // Background
            Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            bgPaint.setColor(Color.parseColor("#1a1a2e"));  // Dark purple
            canvas.drawRoundRect(new RectF(0, 0, size, size), 24, 24, bgPaint);
            
            if ("thumbnail".equals(item.iconType) && item.iconValue != null && !item.iconValue.isEmpty()) {
                // Decode base64 thumbnail
                try {
                    String base64Data = item.iconValue;
                    if (base64Data.contains(",")) {
                        base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                    }
                    byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                    Bitmap thumbBitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                    if (thumbBitmap != null) {
                        // Scale and center the thumbnail
                        Bitmap scaledBitmap = Bitmap.createScaledBitmap(thumbBitmap, size, size, true);
                        canvas.drawBitmap(scaledBitmap, 0, 0, null);
                        thumbBitmap.recycle();
                        scaledBitmap.recycle();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to decode thumbnail: " + e.getMessage());
                    drawTextIcon(canvas, size, item.name);
                }
            } else if ("emoji".equals(item.iconType) && item.iconValue != null) {
                // Draw emoji
                Paint emojiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                emojiPaint.setTextSize(size * 0.6f);
                emojiPaint.setTextAlign(Paint.Align.CENTER);
                
                Rect bounds = new Rect();
                emojiPaint.getTextBounds(item.iconValue, 0, item.iconValue.length(), bounds);
                float y = (size + bounds.height()) / 2f;
                
                canvas.drawText(item.iconValue, size / 2f, y, emojiPaint);
            } else {
                // Draw text icon (first letter)
                drawTextIcon(canvas, size, item.iconValue != null && !item.iconValue.isEmpty() ? 
                    item.iconValue : item.name);
            }
            
            return bitmap;
        }
        
        private void drawTextIcon(Canvas canvas, int size, String text) {
            Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            textPaint.setColor(Color.WHITE);
            textPaint.setTextSize(size * 0.4f);
            textPaint.setTextAlign(Paint.Align.CENTER);
            textPaint.setFakeBoldText(true);
            
            String displayText = text.length() > 2 ? text.substring(0, 2).toUpperCase() : text.toUpperCase();
            
            Rect bounds = new Rect();
            textPaint.getTextBounds(displayText, 0, displayText.length(), bounds);
            float y = (size + bounds.height()) / 2f;
            
            canvas.drawText(displayText, size / 2f, y, textPaint);
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;  // Use default loading view
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            if (position < shortcuts.size()) {
                return shortcuts.get(position).id.hashCode();
            }
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }

    /**
     * Simple data class for shortcut items
     */
    private static class ShortcutItem {
        String id;
        String name;
        String type;
        String contentUri;
        int usageCount;
        String mimeType;
        String phoneNumber;
        String messageApp;
        String iconType;
        String iconValue;
    }
}
