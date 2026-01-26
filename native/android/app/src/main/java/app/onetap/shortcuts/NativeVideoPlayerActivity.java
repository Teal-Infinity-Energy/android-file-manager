package app.onetap.shortcuts;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.SurfaceTexture;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.MediaController;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * NativeVideoPlayerActivity
 * Native Android video playback using TextureView + MediaPlayer.
 * Falls back to external player apps if internal playback fails.
 * Includes debug overlay for diagnosing device-specific failures.
 */
public class NativeVideoPlayerActivity extends Activity implements TextureView.SurfaceTextureListener, MediaController.MediaPlayerControl {
    private static final String TAG = "NativeVideoPlayer";
    private static final int AUTO_HIDE_DELAY_MS = 4000;

    private FrameLayout root;
    private TextureView textureView;
    private LinearLayout topBar;
    private LinearLayout debugOverlay;
    private TextView debugTextView;
    private boolean isDebugVisible = false;

    private MediaPlayer mediaPlayer;
    private MediaController mediaController;
    private Surface surface;

    private Uri videoUri;
    private String videoMimeType;
    private boolean isPrepared = false;
    private int videoWidth = 0;
    private int videoHeight = 0;
    private boolean hasTriedExternalFallback = false;
    private boolean isTopBarVisible = true;

    // Debug logging
    private final List<String> debugLogs = new ArrayList<>();
    private long startTimeMs;

    private final Handler hideHandler = new Handler(Looper.getMainLooper());
    private final Runnable hideRunnable = () -> {
        if (mediaController != null) mediaController.hide();
        hideTopBar();
    };

    private void logDebug(String level, String message) {
        long elapsed = System.currentTimeMillis() - startTimeMs;
        String timestamp = String.format(Locale.US, "+%d.%03ds", elapsed / 1000, elapsed % 1000);
        String logLine = String.format("[%s] %s: %s", timestamp, level, message);
        
        // Log to Android logcat
        if ("ERROR".equals(level)) {
            Log.e(TAG, message);
        } else if ("WARN".equals(level)) {
            Log.w(TAG, message);
        } else {
            Log.d(TAG, message);
        }
        
        // Store for debug overlay
        debugLogs.add(logLine);
        
        // Update debug overlay if visible
        updateDebugOverlay();
    }

    private void logInfo(String message) {
        logDebug("INFO", message);
    }

    private void logWarn(String message) {
        logDebug("WARN", message);
    }

    private void logError(String message) {
        logDebug("ERROR", message);
    }

    private void updateDebugOverlay() {
        if (debugTextView == null) return;
        
        runOnUiThread(() -> {
            StringBuilder sb = new StringBuilder();
            sb.append("=== VIDEO PLAYER DEBUG ===\n\n");
            
            // Device info
            sb.append("DEVICE:\n");
            sb.append("  Model: ").append(Build.MODEL).append("\n");
            sb.append("  Android: ").append(Build.VERSION.RELEASE).append(" (API ").append(Build.VERSION.SDK_INT).append(")\n");
            sb.append("  Manufacturer: ").append(Build.MANUFACTURER).append("\n\n");
            
            // Video info
            sb.append("VIDEO:\n");
            sb.append("  URI: ").append(videoUri != null ? videoUri.toString() : "null").append("\n");
            sb.append("  Scheme: ").append(videoUri != null ? videoUri.getScheme() : "null").append("\n");
            sb.append("  MIME: ").append(videoMimeType).append("\n");
            if (videoWidth > 0 && videoHeight > 0) {
                sb.append("  Resolution: ").append(videoWidth).append("x").append(videoHeight).append("\n");
            }
            sb.append("\n");
            
            // State
            sb.append("STATE:\n");
            sb.append("  isPrepared: ").append(isPrepared).append("\n");
            sb.append("  isPlaying: ").append(isPlaying()).append("\n");
            sb.append("  hasTriedExternal: ").append(hasTriedExternalFallback).append("\n\n");
            
            // Timeline
            sb.append("TIMELINE:\n");
            for (String log : debugLogs) {
                sb.append("  ").append(log).append("\n");
            }
            
            debugTextView.setText(sb.toString());
        });
    }

    private void exitPlayerAndApp() {
        logInfo("Exiting player");
        releasePlayer();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
    }

    private void releasePlayer() {
        hideHandler.removeCallbacks(hideRunnable);

        if (mediaController != null) {
            try {
                mediaController.hide();
            } catch (Exception ignored) {}
        }

        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
            } catch (Exception ignored) {}
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }

        if (surface != null) {
            try {
                surface.release();
            } catch (Exception ignored) {}
            surface = null;
        }

        isPrepared = false;
    }

    private void showTopBar() {
        if (topBar != null) {
            topBar.setVisibility(View.VISIBLE);
            topBar.animate().alpha(1f).setDuration(200).start();
            isTopBarVisible = true;
        }
    }

    private void hideTopBar() {
        if (topBar != null) {
            topBar.animate().alpha(0f).setDuration(200).withEndAction(() -> {
                if (topBar != null) topBar.setVisibility(View.GONE);
            }).start();
            isTopBarVisible = false;
        }
    }

    private void toggleMediaControls() {
        if (mediaController == null) return;

        // Show/hide controls and top bar together
        if (isTopBarVisible) {
            mediaController.hide();
            hideTopBar();
        } else {
            mediaController.show(AUTO_HIDE_DELAY_MS);
            showTopBar();
            hideHandler.removeCallbacks(hideRunnable);
            hideHandler.postDelayed(hideRunnable, AUTO_HIDE_DELAY_MS);
        }
    }

    private void toggleDebugOverlay() {
        if (debugOverlay == null) return;
        
        isDebugVisible = !isDebugVisible;
        debugOverlay.setVisibility(isDebugVisible ? View.VISIBLE : View.GONE);
        
        if (isDebugVisible) {
            updateDebugOverlay();
            // Keep controls visible while debug is shown
            hideHandler.removeCallbacks(hideRunnable);
        }
    }

    private int dpToPx(int dp) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics()
        );
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startTimeMs = System.currentTimeMillis();

        try {
            logInfo("onCreate started");
            
            // Fullscreen
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                getWindow().setDecorFitsSystemWindows(false);
                WindowInsetsController controller = getWindow().getInsetsController();
                if (controller != null) {
                    controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                );
            }

            // Root
            root = new FrameLayout(this);
            root.setBackgroundColor(0xFF000000);
            setContentView(root);

            // Video surface
            textureView = new TextureView(this);
            textureView.setSurfaceTextureListener(this);
            FrameLayout.LayoutParams videoParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
            );
            root.addView(textureView, videoParams);

            // Tap toggles media controls
            textureView.setOnClickListener(v -> toggleMediaControls());

            // Intent data
            Intent intent = getIntent();
            videoUri = intent != null ? intent.getData() : null;
            videoMimeType = intent != null ? intent.getType() : "video/*";
            if (videoMimeType == null || videoMimeType.isEmpty()) {
                videoMimeType = "video/*";
            }
            
            logInfo("URI: " + (videoUri != null ? videoUri.toString() : "null"));
            logInfo("MIME type: " + videoMimeType);
            logInfo("Scheme: " + (videoUri != null ? videoUri.getScheme() : "null"));
            
            // Log additional URI details
            if (videoUri != null) {
                logUriDetails(videoUri);
            }

            if (videoUri == null) {
                logError("No video URI provided");
                showErrorAndFinish("No video URI provided");
                return;
            }

            // Check permissions for content URI
            checkUriPermissions(videoUri);

            // Create top bar with buttons
            createTopBar();
            
            // Create debug overlay
            createDebugOverlay();

            // MediaController
            mediaController = new MediaController(this);
            mediaController.setMediaPlayer(this);
            mediaController.setAnchorView(root);
            
            logInfo("MediaController initialized");
            
            // Schedule initial hide
            hideHandler.postDelayed(hideRunnable, AUTO_HIDE_DELAY_MS);
        } catch (Exception e) {
            logError("onCreate error: " + e.getMessage());
            showErrorAndFinish("Failed to initialize video player");
        }
    }

    private void logUriDetails(Uri uri) {
        try {
            String scheme = uri.getScheme();
            
            if ("content".equals(scheme)) {
                // Try to get file info from content resolver
                ContentResolver resolver = getContentResolver();
                String mimeFromResolver = resolver.getType(uri);
                logInfo("ContentResolver MIME: " + (mimeFromResolver != null ? mimeFromResolver : "null"));
                
                try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        // Get display name
                        int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                        if (nameIndex >= 0) {
                            String displayName = cursor.getString(nameIndex);
                            logInfo("File name: " + displayName);
                        }
                        
                        // Get size
                        int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                        if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) {
                            long size = cursor.getLong(sizeIndex);
                            logInfo("File size: " + formatFileSize(size));
                        }
                    }
                } catch (Exception e) {
                    logWarn("Failed to query URI details: " + e.getMessage());
                }
            } else if ("file".equals(scheme)) {
                String path = uri.getPath();
                logInfo("File path: " + path);
            }
        } catch (Exception e) {
            logWarn("Failed to log URI details: " + e.getMessage());
        }
    }

    private void checkUriPermissions(Uri uri) {
        try {
            String scheme = uri.getScheme();
            
            if ("content".equals(scheme)) {
                // Check if we have read permission
                int permissionCheck = checkUriPermission(
                    uri,
                    android.os.Process.myPid(),
                    android.os.Process.myUid(),
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                );
                
                boolean hasPermission = (permissionCheck == PackageManager.PERMISSION_GRANTED);
                logInfo("URI read permission: " + (hasPermission ? "GRANTED" : "DENIED"));
                
                if (!hasPermission) {
                    logWarn("May need to request URI permission");
                }
            } else {
                logInfo("Non-content URI, no permission check needed");
            }
        } catch (Exception e) {
            logWarn("Permission check failed: " + e.getMessage());
        }
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format(Locale.US, "%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format(Locale.US, "%.1f MB", bytes / (1024.0 * 1024));
        return String.format(Locale.US, "%.1f GB", bytes / (1024.0 * 1024 * 1024));
    }

    private void createTopBar() {
        // Top bar container with gradient background
        topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.END | Gravity.CENTER_VERTICAL);
        topBar.setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16));
        
        // Gradient background (top to transparent)
        GradientDrawable gradient = new GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            new int[]{0x80000000, 0x00000000}
        );
        topBar.setBackground(gradient);

        FrameLayout.LayoutParams topBarParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dpToPx(72),
            Gravity.TOP
        );
        root.addView(topBar, topBarParams);

        // Debug button (bug icon)
        ImageButton debugButton = createIconButton(
            android.R.drawable.ic_menu_info_details,
            "Show debug info"
        );
        debugButton.setOnClickListener(v -> toggleDebugOverlay());
        
        LinearLayout.LayoutParams debugParams = new LinearLayout.LayoutParams(
            dpToPx(48), dpToPx(48)
        );
        debugParams.setMargins(dpToPx(8), 0, dpToPx(8), 0);
        topBar.addView(debugButton, debugParams);

        // "Open with" button
        ImageButton openWithButton = createIconButton(
            android.R.drawable.ic_menu_share,
            "Open with another app"
        );
        openWithButton.setOnClickListener(v -> openInExternalPlayerDirect());
        
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
            dpToPx(48), dpToPx(48)
        );
        buttonParams.setMargins(dpToPx(8), 0, dpToPx(8), 0);
        topBar.addView(openWithButton, buttonParams);
    }

    private void createDebugOverlay() {
        // Semi-transparent overlay
        debugOverlay = new LinearLayout(this);
        debugOverlay.setOrientation(LinearLayout.VERTICAL);
        debugOverlay.setBackgroundColor(0xDD000000);
        debugOverlay.setPadding(dpToPx(16), dpToPx(80), dpToPx(16), dpToPx(16));
        debugOverlay.setVisibility(View.GONE);
        
        FrameLayout.LayoutParams overlayParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        );
        root.addView(debugOverlay, overlayParams);
        
        // Title
        TextView titleView = new TextView(this);
        titleView.setText("Debug Info (tap ⓘ to close)");
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        titleView.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        titleView.setPadding(0, 0, 0, dpToPx(8));
        debugOverlay.addView(titleView);
        
        // Scrollable debug text
        ScrollView scrollView = new ScrollView(this);
        LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1.0f
        );
        debugOverlay.addView(scrollView, scrollParams);
        
        debugTextView = new TextView(this);
        debugTextView.setTextColor(0xFF00FF00); // Green terminal color
        debugTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        debugTextView.setTypeface(Typeface.MONOSPACE);
        debugTextView.setLineSpacing(0, 1.2f);
        scrollView.addView(debugTextView);
        
        // Copy button
        TextView copyButton = new TextView(this);
        copyButton.setText("📋 Copy to Clipboard");
        copyButton.setTextColor(Color.WHITE);
        copyButton.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        copyButton.setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12));
        copyButton.setGravity(Gravity.CENTER);
        
        GradientDrawable copyBg = new GradientDrawable();
        copyBg.setCornerRadius(dpToPx(8));
        copyBg.setColor(0xFF333333);
        copyButton.setBackground(copyBg);
        
        LinearLayout.LayoutParams copyParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        copyParams.topMargin = dpToPx(12);
        debugOverlay.addView(copyButton, copyParams);
        
        copyButton.setOnClickListener(v -> copyDebugToClipboard());
        
        // Tap overlay to close
        debugOverlay.setOnClickListener(v -> toggleDebugOverlay());
    }

    private void copyDebugToClipboard() {
        try {
            android.content.ClipboardManager clipboard = 
                (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (clipboard != null && debugTextView != null) {
                ClipData clip = ClipData.newPlainText("Video Debug Info", debugTextView.getText());
                clipboard.setPrimaryClip(clip);
                Toast.makeText(this, "Debug info copied!", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            logWarn("Failed to copy to clipboard: " + e.getMessage());
        }
    }

    private ImageButton createIconButton(int iconResId, String contentDescription) {
        ImageButton button = new ImageButton(this);
        button.setImageResource(iconResId);
        button.setContentDescription(contentDescription);
        button.setColorFilter(Color.WHITE);
        
        // Circular background
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(0x40FFFFFF);
        button.setBackground(bg);
        button.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        button.setPadding(dpToPx(12), dpToPx(12), dpToPx(12), dpToPx(12));
        
        return button;
    }

    private void showErrorAndFinish(String message) {
        try {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {}
        finish();
    }

    /**
     * Opens video in external player directly without dialog.
     * Used when user taps the "Open with" button.
     */
    private void openInExternalPlayerDirect() {
        if (videoUri == null) {
            Toast.makeText(this, "No video to open", Toast.LENGTH_SHORT).show();
            return;
        }
        
        logInfo("Opening in external player (manual)");
        
        // Pause current playback
        if (mediaPlayer != null && isPrepared) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.pause();
            } catch (Exception ignored) {}
        }
        
        try {
            Intent externalIntent = new Intent(Intent.ACTION_VIEW);
            externalIntent.setDataAndType(videoUri, videoMimeType);
            externalIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            
            // Add ClipData for content URIs to ensure permission propagation
            if ("content".equals(videoUri.getScheme())) {
                try {
                    externalIntent.setClipData(ClipData.newUri(getContentResolver(), "video", videoUri));
                } catch (Exception e) {
                    logWarn("Failed to set ClipData: " + e.getMessage());
                }
            }
            
            // Create a chooser to let user pick the app
            Intent chooser = Intent.createChooser(externalIntent, "Open with...");
            startActivity(chooser);
            logInfo("External player launched");
            
            // Finish this activity after opening external player
            finish();
        } catch (ActivityNotFoundException e) {
            logError("No external player found: " + e.getMessage());
            Toast.makeText(this, "No video player app found", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            logError("External player error: " + e.getMessage());
            Toast.makeText(this, "Unable to open external player", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * Attempts to open the video in an external player app.
     * Shows a chooser dialog to let the user pick their preferred app.
     */
    private void openInExternalPlayer() {
        if (videoUri == null || hasTriedExternalFallback) {
            showErrorAndFinish("Unable to play video");
            return;
        }
        
        hasTriedExternalFallback = true;
        logInfo("Falling back to external player");
        releasePlayer();
        
        try {
            Intent externalIntent = new Intent(Intent.ACTION_VIEW);
            externalIntent.setDataAndType(videoUri, videoMimeType);
            externalIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            
            // Add ClipData for content URIs to ensure permission propagation
            if ("content".equals(videoUri.getScheme())) {
                try {
                    externalIntent.setClipData(ClipData.newUri(getContentResolver(), "video", videoUri));
                } catch (Exception e) {
                    logWarn("Failed to set ClipData: " + e.getMessage());
                }
            }
            
            // Create a chooser to let user pick the app
            Intent chooser = Intent.createChooser(externalIntent, "Open with...");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            startActivity(chooser);
            logInfo("External player launched (fallback)");
            finish();
        } catch (ActivityNotFoundException e) {
            logError("No external player found: " + e.getMessage());
            showErrorAndFinish("No video player app found");
        } catch (Exception e) {
            logError("External player error: " + e.getMessage());
            showErrorAndFinish("Unable to play video");
        }
    }

    /**
     * Shows a dialog asking the user if they want to try an external player.
     */
    private void showExternalPlayerDialog(String errorMessage) {
        if (hasTriedExternalFallback) {
            showErrorAndFinish(errorMessage);
            return;
        }
        
        logInfo("Showing external player dialog");
        
        try {
            new AlertDialog.Builder(this)
                .setTitle("Playback Error")
                .setMessage("Unable to play this video. Would you like to try opening it in another app?")
                .setPositiveButton("Open with...", (dialog, which) -> {
                    openInExternalPlayer();
                })
                .setNegativeButton("Cancel", (dialog, which) -> {
                    finish();
                })
                .setOnCancelListener(dialog -> finish())
                .show();
        } catch (Exception e) {
            logError("Failed to show dialog: " + e.getMessage());
            // Fallback: try external player directly
            openInExternalPlayer();
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event != null
            && event.getKeyCode() == KeyEvent.KEYCODE_BACK
            && event.getAction() == KeyEvent.ACTION_UP) {
            exitPlayerAndApp();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        exitPlayerAndApp();
    }

    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surfaceTexture, int width, int height) {
        logInfo("Surface available (" + width + "x" + height + ")");
        
        try {
            surface = new Surface(surfaceTexture);

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setSurface(surface);
            logInfo("MediaPlayer created");
            
            // Use AudioAttributes instead of deprecated setAudioStreamType
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                    .build();
                mediaPlayer.setAudioAttributes(audioAttributes);
                logInfo("AudioAttributes set (USAGE_MEDIA)");
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
                logInfo("AudioStreamType set (STREAM_MUSIC)");
            }

            mediaPlayer.setOnPreparedListener(mp -> {
                try {
                    isPrepared = true;
                    videoWidth = mp.getVideoWidth();
                    videoHeight = mp.getVideoHeight();
                    int duration = mp.getDuration();
                    
                    logInfo("Prepared: " + videoWidth + "x" + videoHeight + ", " + (duration / 1000) + "s");
                    
                    adjustVideoSize();
                    mp.start();
                    logInfo("Playback started");
                    
                    showTopBar();
                    if (mediaController != null) {
                        mediaController.show(AUTO_HIDE_DELAY_MS);
                    } else {
                        logWarn("mediaController not initialized yet");
                    }
                    hideHandler.removeCallbacks(hideRunnable);
                    hideHandler.postDelayed(hideRunnable, AUTO_HIDE_DELAY_MS);
                } catch (Exception e) {
                    logError("onPrepared error: " + e.getMessage());
                    showExternalPlayerDialog("Failed to start playback");
                }
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                String whatStr = translateMediaPlayerError(what);
                String extraStr = translateMediaPlayerExtra(extra);
                logError("MediaPlayer error: " + whatStr + " (" + what + "), extra: " + extraStr + " (" + extra + ")");
                showExternalPlayerDialog("Unable to play video (error: " + what + ")");
                return true;
            });
            
            mediaPlayer.setOnCompletionListener(mp -> {
                logInfo("Playback completed");
            });
            
            mediaPlayer.setOnInfoListener((mp, what, extra) -> {
                String infoStr = translateMediaPlayerInfo(what);
                logInfo("MediaPlayer info: " + infoStr + " (" + what + ")");
                return false;
            });
            
            mediaPlayer.setOnBufferingUpdateListener((mp, percent) -> {
                if (percent % 25 == 0) { // Log at 0%, 25%, 50%, 75%, 100%
                    logInfo("Buffering: " + percent + "%");
                }
            });

            logInfo("Setting data source...");
            try {
                mediaPlayer.setDataSource(this, videoUri);
                logInfo("Data source set, preparing...");
                mediaPlayer.prepareAsync();
            } catch (IOException e) {
                logError("IOException: " + e.getMessage());
                showExternalPlayerDialog("Cannot access video file");
            } catch (IllegalArgumentException e) {
                logError("IllegalArgumentException: " + e.getMessage());
                showExternalPlayerDialog("Invalid video file");
            } catch (SecurityException e) {
                logError("SecurityException: " + e.getMessage());
                showExternalPlayerDialog("Permission denied to access video");
            }
        } catch (Exception e) {
            logError("Setup error: " + e.getMessage());
            showExternalPlayerDialog("Failed to initialize video playback");
        }
    }

    private String translateMediaPlayerError(int what) {
        switch (what) {
            case MediaPlayer.MEDIA_ERROR_UNKNOWN: return "UNKNOWN";
            case MediaPlayer.MEDIA_ERROR_SERVER_DIED: return "SERVER_DIED";
            default: return "CODE_" + what;
        }
    }

    private String translateMediaPlayerExtra(int extra) {
        switch (extra) {
            case MediaPlayer.MEDIA_ERROR_IO: return "IO_ERROR";
            case MediaPlayer.MEDIA_ERROR_MALFORMED: return "MALFORMED";
            case MediaPlayer.MEDIA_ERROR_UNSUPPORTED: return "UNSUPPORTED";
            case MediaPlayer.MEDIA_ERROR_TIMED_OUT: return "TIMED_OUT";
            case -2147483648: return "LOW_LEVEL_ERROR";
            default: return "CODE_" + extra;
        }
    }

    private String translateMediaPlayerInfo(int what) {
        switch (what) {
            case MediaPlayer.MEDIA_INFO_UNKNOWN: return "UNKNOWN";
            case MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START: return "VIDEO_RENDERING_START";
            case MediaPlayer.MEDIA_INFO_BUFFERING_START: return "BUFFERING_START";
            case MediaPlayer.MEDIA_INFO_BUFFERING_END: return "BUFFERING_END";
            case MediaPlayer.MEDIA_INFO_VIDEO_TRACK_LAGGING: return "VIDEO_TRACK_LAGGING";
            case MediaPlayer.MEDIA_INFO_BAD_INTERLEAVING: return "BAD_INTERLEAVING";
            case MediaPlayer.MEDIA_INFO_NOT_SEEKABLE: return "NOT_SEEKABLE";
            case MediaPlayer.MEDIA_INFO_METADATA_UPDATE: return "METADATA_UPDATE";
            default: return "CODE_" + what;
        }
    }

    private void adjustVideoSize() {
        if (videoWidth == 0 || videoHeight == 0) return;

        int screenWidth = root.getWidth();
        int screenHeight = root.getHeight();
        if (screenWidth == 0 || screenHeight == 0) return;

        float videoAspect = (float) videoWidth / videoHeight;
        float screenAspect = (float) screenWidth / screenHeight;

        int newWidth;
        int newHeight;

        if (videoAspect > screenAspect) {
            newWidth = screenWidth;
            newHeight = (int) (screenWidth / videoAspect);
        } else {
            newHeight = screenHeight;
            newWidth = (int) (screenHeight * videoAspect);
        }

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(newWidth, newHeight, Gravity.CENTER);
        textureView.setLayoutParams(params);
    }

    @Override
    public void onSurfaceTextureSizeChanged(SurfaceTexture surfaceTexture, int width, int height) {
        adjustVideoSize();
    }

    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surfaceTexture) {
        releasePlayer();
        return true;
    }

    @Override
    public void onSurfaceTextureUpdated(SurfaceTexture surfaceTexture) {
        // no-op
    }

    // MediaController.MediaPlayerControl
    @Override
    public void start() {
        if (mediaPlayer != null && isPrepared) {
            try {
                mediaPlayer.start();
            } catch (Exception e) {
                logError("Error starting: " + e.getMessage());
            }
        }
    }

    @Override
    public void pause() {
        if (mediaPlayer != null && isPrepared) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.pause();
            } catch (Exception e) {
                logError("Error pausing: " + e.getMessage());
            }
        }
    }

    @Override
    public int getDuration() {
        try {
            return (mediaPlayer != null && isPrepared) ? mediaPlayer.getDuration() : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public int getCurrentPosition() {
        try {
            return (mediaPlayer != null && isPrepared) ? mediaPlayer.getCurrentPosition() : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public void seekTo(int pos) {
        if (mediaPlayer != null && isPrepared) {
            try {
                mediaPlayer.seekTo(pos);
            } catch (Exception e) {
                logError("Error seeking: " + e.getMessage());
            }
        }
    }

    @Override
    public boolean isPlaying() {
        try {
            return mediaPlayer != null && isPrepared && mediaPlayer.isPlaying();
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public int getBufferPercentage() {
        return 0;
    }

    @Override
    public boolean canPause() {
        return true;
    }

    @Override
    public boolean canSeekBackward() {
        return true;
    }

    @Override
    public boolean canSeekForward() {
        return true;
    }

    @Override
    public int getAudioSessionId() {
        try {
            return mediaPlayer != null ? mediaPlayer.getAudioSessionId() : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.pause();
            } catch (Exception e) {
                logError("Error pausing in onPause: " + e.getMessage());
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        releasePlayer();
    }
}
