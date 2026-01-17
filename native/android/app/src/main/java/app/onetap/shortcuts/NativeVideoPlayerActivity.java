package app.onetap.shortcuts;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.SurfaceTexture;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.MediaController;

import java.io.IOException;

/**
 * NativeVideoPlayerActivity
 * Uses TextureView + MediaPlayer for reliable overlay rendering.
 * VideoView uses SurfaceView which can obscure overlays.
 */
public class NativeVideoPlayerActivity extends Activity implements TextureView.SurfaceTextureListener, MediaController.MediaPlayerControl {
    private static final String TAG = "NativeVideoPlayer";
    private static final int AUTO_HIDE_DELAY_MS = 4000;

    private TextureView textureView;
    private MediaPlayer mediaPlayer;
    private MediaController mediaController;
    private Surface surface;
    private Uri videoUri;
    private boolean isPrepared = false;
    private int videoWidth = 0;
    private int videoHeight = 0;

    private ImageButton closeButton;
    private View headerGradient;
    private FrameLayout root;
    private Handler hideHandler = new Handler(Looper.getMainLooper());
    private boolean controlsVisible = true;

    private Runnable hideRunnable = new Runnable() {
        @Override
        public void run() {
            hideControls();
        }
    };

    private void exitPlayerAndApp() {
        Log.d(TAG, "Exiting player");
        releasePlayer();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
    }

    private void releasePlayer() {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
            } catch (Exception ignored) {}
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (surface != null) {
            surface.release();
            surface = null;
        }
        isPrepared = false;
    }

    private void showControls() {
        controlsVisible = true;
        if (closeButton != null) {
            closeButton.setVisibility(View.VISIBLE);
            closeButton.animate().alpha(1f).setDuration(200).start();
        }
        if (headerGradient != null) {
            headerGradient.setVisibility(View.VISIBLE);
            headerGradient.animate().alpha(1f).setDuration(200).start();
        }
        if (mediaController != null) {
            mediaController.show(AUTO_HIDE_DELAY_MS);
        }
        scheduleHide();
    }

    private void hideControls() {
        controlsVisible = false;
        if (closeButton != null) {
            closeButton.animate().alpha(0f).setDuration(200).withEndAction(() -> {
                if (!controlsVisible && closeButton != null) {
                    closeButton.setVisibility(View.INVISIBLE);
                }
            }).start();
        }
        if (headerGradient != null) {
            headerGradient.animate().alpha(0f).setDuration(200).withEndAction(() -> {
                if (!controlsVisible && headerGradient != null) {
                    headerGradient.setVisibility(View.INVISIBLE);
                }
            }).start();
        }
        if (mediaController != null) {
            mediaController.hide();
        }
    }

    private void toggleControls() {
        if (controlsVisible) {
            hideHandler.removeCallbacks(hideRunnable);
            hideControls();
        } else {
            showControls();
        }
    }

    private void scheduleHide() {
        hideHandler.removeCallbacks(hideRunnable);
        hideHandler.postDelayed(hideRunnable, AUTO_HIDE_DELAY_MS);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event != null && event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
            exitPlayerAndApp();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        exitPlayerAndApp();
    }

    /**
     * Custom drawable that draws an X icon
     */
    private static class CloseIconDrawable extends Drawable {
        private final Paint paint;
        
        public CloseIconDrawable() {
            paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            paint.setColor(Color.WHITE);
            paint.setStrokeWidth(6f);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStyle(Paint.Style.STROKE);
        }

        @Override
        public void draw(Canvas canvas) {
            int width = getBounds().width();
            int height = getBounds().height();
            int padding = (int) (width * 0.3f);
            
            // Draw X
            canvas.drawLine(padding, padding, width - padding, height - padding, paint);
            canvas.drawLine(width - padding, padding, padding, height - padding, paint);
        }

        @Override
        public void setAlpha(int alpha) {
            paint.setAlpha(alpha);
        }

        @Override
        public void setColorFilter(ColorFilter colorFilter) {
            paint.setColorFilter(colorFilter);
        }

        @Override
        public int getOpacity() {
            return PixelFormat.TRANSLUCENT;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make fullscreen immersive
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

        // Create root FrameLayout
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        setContentView(root);

        // Create TextureView for video (behaves like a normal view, overlays work correctly)
        textureView = new TextureView(this);
        textureView.setSurfaceTextureListener(this);
        FrameLayout.LayoutParams videoParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
            Gravity.CENTER
        );
        root.addView(textureView, videoParams);

        // Create overlay container (on top of video)
        FrameLayout overlayContainer = new FrameLayout(this);
        overlayContainer.setClickable(false);
        FrameLayout.LayoutParams overlayParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        );
        root.addView(overlayContainer, overlayParams);

        // Get safe area insets
        int statusBarHeight = 0;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            statusBarHeight = getResources().getDimensionPixelSize(resourceId);
        }
        // Fallback minimum
        if (statusBarHeight < 24) {
            statusBarHeight = (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, 24, getResources().getDisplayMetrics()
            );
        }

        // Create header gradient overlay
        headerGradient = new View(this);
        int gradientHeight = (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 140, getResources().getDisplayMetrics()
        );
        GradientDrawable gradient = new GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            new int[]{0xCC000000, 0x00000000}
        );
        headerGradient.setBackground(gradient);
        FrameLayout.LayoutParams gradientParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            gradientHeight,
            Gravity.TOP
        );
        overlayContainer.addView(headerGradient, gradientParams);

        // Create close button with custom X drawable
        closeButton = new ImageButton(this);
        closeButton.setImageDrawable(new CloseIconDrawable());
        
        // Create circular semi-transparent background
        GradientDrawable buttonBg = new GradientDrawable();
        buttonBg.setShape(GradientDrawable.OVAL);
        buttonBg.setColor(0x88000000); // Semi-transparent black (more visible)
        closeButton.setBackground(buttonBg);
        closeButton.setContentDescription("Close");
        closeButton.setClickable(true);
        closeButton.setFocusable(true);
        
        int buttonSize = (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 52, getResources().getDisplayMetrics()
        );
        int buttonMarginLeft = (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 16, getResources().getDisplayMetrics()
        );
        int buttonMarginTop = statusBarHeight + (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 12, getResources().getDisplayMetrics()
        );
        int buttonPadding = (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 14, getResources().getDisplayMetrics()
        );
        
        FrameLayout.LayoutParams buttonParams = new FrameLayout.LayoutParams(buttonSize, buttonSize);
        buttonParams.gravity = Gravity.TOP | Gravity.START;
        buttonParams.setMargins(buttonMarginLeft, buttonMarginTop, 0, 0);
        closeButton.setPadding(buttonPadding, buttonPadding, buttonPadding, buttonPadding);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            closeButton.setElevation(16f);
            closeButton.setTranslationZ(16f);
        }
        
        overlayContainer.addView(closeButton, buttonParams);
        
        // Bring to front explicitly
        closeButton.bringToFront();
        headerGradient.bringToFront();
        overlayContainer.bringToFront();

        closeButton.setOnClickListener(v -> {
            Log.d(TAG, "Close button clicked");
            exitPlayerAndApp();
        });

        // Tap anywhere on overlay toggles controls
        overlayContainer.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_UP) {
                // Check if tap is not on the close button
                int[] buttonLocation = new int[2];
                closeButton.getLocationOnScreen(buttonLocation);
                int[] touchLocation = new int[] {(int) event.getRawX(), (int) event.getRawY()};
                
                boolean onButton = touchLocation[0] >= buttonLocation[0] 
                    && touchLocation[0] <= buttonLocation[0] + closeButton.getWidth()
                    && touchLocation[1] >= buttonLocation[1]
                    && touchLocation[1] <= buttonLocation[1] + closeButton.getHeight();
                    
                if (!onButton) {
                    toggleControls();
                }
            }
            return true;
        });

        // Get video URI
        Intent intent = getIntent();
        videoUri = intent != null ? intent.getData() : null;
        String mimeType = intent != null ? intent.getType() : null;

        Log.d(TAG, "Starting native playback. uri=" + videoUri + ", type=" + mimeType);

        if (videoUri == null) {
            Log.e(TAG, "No video URI provided");
            finish();
            return;
        }

        // Setup MediaController
        mediaController = new MediaController(this);
        mediaController.setMediaPlayer(this);
        mediaController.setAnchorView(root);
    }

    @Override
    public void onSurfaceTextureAvailable(SurfaceTexture surfaceTexture, int width, int height) {
        Log.d(TAG, "SurfaceTexture available, creating MediaPlayer");
        
        surface = new Surface(surfaceTexture);
        
        mediaPlayer = new MediaPlayer();
        mediaPlayer.setSurface(surface);
        mediaPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC);
        
        mediaPlayer.setOnPreparedListener(mp -> {
            Log.d(TAG, "MediaPlayer prepared, starting playback");
            isPrepared = true;
            videoWidth = mp.getVideoWidth();
            videoHeight = mp.getVideoHeight();
            adjustVideoSize();
            mp.start();
            showControls();
        });
        
        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
            Log.e(TAG, "MediaPlayer error what=" + what + " extra=" + extra);
            return false;
        });
        
        mediaPlayer.setOnCompletionListener(mp -> {
            Log.d(TAG, "Video playback completed");
            showControls();
        });
        
        try {
            mediaPlayer.setDataSource(this, videoUri);
            mediaPlayer.prepareAsync();
        } catch (IOException e) {
            Log.e(TAG, "Failed to set data source: " + e.getMessage());
            finish();
        }
    }

    private void adjustVideoSize() {
        if (videoWidth == 0 || videoHeight == 0) return;
        
        int screenWidth = root.getWidth();
        int screenHeight = root.getHeight();
        
        if (screenWidth == 0 || screenHeight == 0) return;
        
        float videoAspect = (float) videoWidth / videoHeight;
        float screenAspect = (float) screenWidth / screenHeight;
        
        int newWidth, newHeight;
        if (videoAspect > screenAspect) {
            // Video is wider, fit by width
            newWidth = screenWidth;
            newHeight = (int) (screenWidth / videoAspect);
        } else {
            // Video is taller, fit by height
            newHeight = screenHeight;
            newWidth = (int) (screenHeight * videoAspect);
        }
        
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(newWidth, newHeight, Gravity.CENTER);
        textureView.setLayoutParams(params);
    }

    @Override
    public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {
        adjustVideoSize();
    }

    @Override
    public boolean onSurfaceTextureDestroyed(SurfaceTexture surfaceTexture) {
        releasePlayer();
        return true;
    }

    @Override
    public void onSurfaceTextureUpdated(SurfaceTexture surface) {
        // No-op
    }

    // MediaController.MediaPlayerControl implementation
    @Override
    public void start() {
        if (mediaPlayer != null && isPrepared) {
            mediaPlayer.start();
        }
    }

    @Override
    public void pause() {
        if (mediaPlayer != null && isPrepared && mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
        }
    }

    @Override
    public int getDuration() {
        if (mediaPlayer != null && isPrepared) {
            return mediaPlayer.getDuration();
        }
        return 0;
    }

    @Override
    public int getCurrentPosition() {
        if (mediaPlayer != null && isPrepared) {
            return mediaPlayer.getCurrentPosition();
        }
        return 0;
    }

    @Override
    public void seekTo(int pos) {
        if (mediaPlayer != null && isPrepared) {
            mediaPlayer.seekTo(pos);
        }
    }

    @Override
    public boolean isPlaying() {
        if (mediaPlayer != null && isPrepared) {
            return mediaPlayer.isPlaying();
        }
        return false;
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
        if (mediaPlayer != null) {
            return mediaPlayer.getAudioSessionId();
        }
        return 0;
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        hideHandler.removeCallbacks(hideRunnable);
        releasePlayer();
    }
}
