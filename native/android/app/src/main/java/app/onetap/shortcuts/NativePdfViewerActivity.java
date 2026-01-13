package app.onetap.shortcuts;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

/**
 * NativePdfViewerActivity provides an in-app PDF viewing experience with page resumption.
 * 
 * Features:
 * - Renders PDF pages using Android's PdfRenderer
 * - Tracks the current page number as user scrolls
 * - Saves/loads last viewed page to SharedPreferences
 * - Resumes at last viewed page on subsequent opens
 * 
 * Note: Uses Android's built-in PdfRenderer (no external dependencies).
 * For more advanced features, consider adding a library like AndroidPdfViewer.
 */
public class NativePdfViewerActivity extends Activity {
    
    private static final String TAG = "NativePdfViewer";
    private static final String PREFS_NAME = "pdf_resume_prefs";
    private static final String KEY_PREFIX = "pdf_page_";
    
    private PdfRenderer pdfRenderer;
    private ParcelFileDescriptor fileDescriptor;
    private ScrollView scrollView;
    private LinearLayout pagesContainer;
    private TextView pageIndicator;
    
    private String shortcutId;
    private int currentPage = 0;
    private int totalPages = 0;
    private int[] pagePositions; // Y positions of each page in the scroll view
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Fullscreen
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        // Create layout
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(Color.parseColor("#1a1a1a"));
        
        // Page indicator
        pageIndicator = new TextView(this);
        pageIndicator.setTextColor(Color.WHITE);
        pageIndicator.setTextSize(14);
        pageIndicator.setPadding(24, 16, 24, 16);
        pageIndicator.setBackgroundColor(Color.parseColor("#333333"));
        rootLayout.addView(pageIndicator);
        
        // ScrollView for pages
        scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        
        pagesContainer = new LinearLayout(this);
        pagesContainer.setOrientation(LinearLayout.VERTICAL);
        pagesContainer.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        
        scrollView.addView(pagesContainer);
        rootLayout.addView(scrollView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0, 1.0f
        ));
        
        setContentView(rootLayout);
        
        // Track scroll position to update current page
        scrollView.getViewTreeObserver().addOnScrollChangedListener(() -> {
            if (pagePositions != null && pagePositions.length > 0) {
                int scrollY = scrollView.getScrollY();
                int newPage = 0;
                
                for (int i = 0; i < pagePositions.length; i++) {
                    if (scrollY >= pagePositions[i]) {
                        newPage = i;
                    }
                }
                
                if (newPage != currentPage) {
                    currentPage = newPage;
                    updatePageIndicator();
                }
            }
        });
        
        // Handle intent
        handleIntent(getIntent());
    }
    
    private void handleIntent(Intent intent) {
        if (intent == null) {
            showError("No intent received");
            return;
        }
        
        Uri pdfUri = intent.getData();
        shortcutId = intent.getStringExtra("shortcut_id");
        
        Log.d(TAG, "Opening PDF: uri=" + pdfUri + ", shortcutId=" + shortcutId);
        
        if (pdfUri == null) {
            showError("No PDF URI provided");
            return;
        }
        
        try {
            openPdf(pdfUri);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open PDF: " + e.getMessage());
            e.printStackTrace();
            showError("Failed to open PDF: " + e.getMessage());
        }
    }
    
    private void openPdf(Uri uri) throws Exception {
        // For content:// URIs, we need to copy to a temp file for PdfRenderer
        File tempFile = copyToTempFile(uri);
        if (tempFile == null) {
            throw new Exception("Failed to access PDF file");
        }
        
        fileDescriptor = ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY);
        pdfRenderer = new PdfRenderer(fileDescriptor);
        
        totalPages = pdfRenderer.getPageCount();
        pagePositions = new int[totalPages];
        
        Log.d(TAG, "PDF opened successfully, total pages: " + totalPages);
        
        // Load saved page position
        int savedPage = loadSavedPage();
        if (savedPage >= 0 && savedPage < totalPages) {
            currentPage = savedPage;
            Log.d(TAG, "Resuming at page: " + (currentPage + 1));
        }
        
        // Render all pages
        renderAllPages();
        
        // Scroll to saved page after layout is complete
        if (currentPage > 0) {
            scrollView.post(() -> {
                if (currentPage < pagePositions.length) {
                    scrollView.scrollTo(0, pagePositions[currentPage]);
                }
            });
        }
        
        updatePageIndicator();
    }
    
    private File copyToTempFile(Uri uri) {
        try {
            InputStream inputStream = getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                Log.e(TAG, "Failed to open input stream for URI: " + uri);
                return null;
            }
            
            File tempDir = new File(getCacheDir(), "pdf_temp");
            if (!tempDir.exists()) {
                tempDir.mkdirs();
            }
            
            File tempFile = new File(tempDir, "temp_" + System.currentTimeMillis() + ".pdf");
            
            FileOutputStream outputStream = new FileOutputStream(tempFile);
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            
            inputStream.close();
            outputStream.close();
            
            Log.d(TAG, "Copied PDF to temp file: " + tempFile.getAbsolutePath());
            return tempFile;
        } catch (Exception e) {
            Log.e(TAG, "Failed to copy PDF to temp file: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
    
    private void renderAllPages() {
        int displayWidth = getResources().getDisplayMetrics().widthPixels;
        int padding = 16; // dp
        float density = getResources().getDisplayMetrics().density;
        int paddingPx = (int) (padding * density);
        
        int cumulativeHeight = 0;
        
        for (int i = 0; i < totalPages; i++) {
            try {
                PdfRenderer.Page page = pdfRenderer.openPage(i);
                
                // Calculate dimensions maintaining aspect ratio
                float aspectRatio = (float) page.getWidth() / (float) page.getHeight();
                int targetWidth = displayWidth - (paddingPx * 2);
                int targetHeight = (int) (targetWidth / aspectRatio);
                
                // Create bitmap with white background
                Bitmap bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                canvas.drawColor(Color.WHITE);
                
                // Render page
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                page.close();
                
                // Store page position
                pagePositions[i] = cumulativeHeight;
                
                // Create ImageView for page
                ImageView pageView = new ImageView(this);
                pageView.setImageBitmap(bitmap);
                pageView.setScaleType(ImageView.ScaleType.FIT_CENTER);
                pageView.setAdjustViewBounds(true);
                
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                );
                params.setMargins(paddingPx, i == 0 ? paddingPx : paddingPx / 2, paddingPx, paddingPx / 2);
                pageView.setLayoutParams(params);
                
                pagesContainer.addView(pageView);
                
                // Update cumulative height
                cumulativeHeight += targetHeight + paddingPx;
                
            } catch (Exception e) {
                Log.e(TAG, "Failed to render page " + i + ": " + e.getMessage());
            }
        }
    }
    
    private void updatePageIndicator() {
        pageIndicator.setText("Page " + (currentPage + 1) + " of " + totalPages);
    }
    
    private int loadSavedPage() {
        if (shortcutId == null || shortcutId.isEmpty()) {
            return 0;
        }
        
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getInt(KEY_PREFIX + shortcutId, 0);
    }
    
    private void savePage() {
        if (shortcutId == null || shortcutId.isEmpty()) {
            Log.d(TAG, "No shortcut ID, not saving page");
            return;
        }
        
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putInt(KEY_PREFIX + shortcutId, currentPage).apply();
        Log.d(TAG, "Saved page: " + (currentPage + 1) + " for shortcut: " + shortcutId);
    }
    
    private void showError(String message) {
        Log.e(TAG, message);
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        finish();
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        savePage();
    }
    
    @Override
    protected void onDestroy() {
        savePage();
        
        // Cleanup
        try {
            if (pdfRenderer != null) {
                pdfRenderer.close();
            }
            if (fileDescriptor != null) {
                fileDescriptor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error closing PDF resources: " + e.getMessage());
        }
        
        // Clean up temp files
        try {
            File tempDir = new File(getCacheDir(), "pdf_temp");
            if (tempDir.exists()) {
                File[] files = tempDir.listFiles();
                if (files != null) {
                    for (File file : files) {
                        file.delete();
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to clean up temp files: " + e.getMessage());
        }
        
        super.onDestroy();
    }
    
    @Override
    public void onBackPressed() {
        savePage();
        super.onBackPressed();
    }
}
