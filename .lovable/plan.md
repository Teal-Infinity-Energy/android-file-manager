

# Fix: PDF Viewer Back Button Should Exit to Home Screen

## Problem

When pressing the back button in the PDF viewer, the app returns to the One Tap main app instead of exiting to the Android home screen. This is inconsistent with the expected behavior for home screen shortcuts.

## Root Cause

The `exitViewer()` method in `NativePdfViewerActivity` uses `finish()`:

```java
private void exitViewer() {
    hideHandler.removeCallbacks(hideRunnable);
    saveResumeState();
    finish();  // ← Returns to previous activity in task stack
    overridePendingTransition(0, android.R.anim.fade_out);
}
```

When a PDF shortcut is tapped from the home screen, the launch sequence is:
1. Android home screen → PDFProxyActivity → NativePdfViewerActivity

Using `finish()` returns to the previous activity in the stack, which may be the main app if it was already running.

## Solution

Use `finishAndRemoveTask()` instead of `finish()`, matching the behavior of `NativeVideoPlayerActivity`:

```java
private void exitViewer() {
    hideHandler.removeCallbacks(hideRunnable);
    saveResumeState();
    
    // Exit to home screen (not back to One Tap app)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        finishAndRemoveTask();
    } else {
        finish();
    }
    overridePendingTransition(0, android.R.anim.fade_out);
}
```

## Technical Details

| Method | Behavior |
|--------|----------|
| `finish()` | Closes current activity, returns to previous in task stack |
| `finishAndRemoveTask()` | Closes activity AND removes the entire task from recents, returning to home |

The `Build.VERSION_CODES.LOLLIPOP` check is for API 21+ compatibility (Android 5.0+), matching how the video player handles it.

## Changes Required

**File:** `native/android/app/src/main/java/app/onetap/shortcuts/NativePdfViewerActivity.java`

1. Add `Build` import if not present
2. Update `exitViewer()` method to use `finishAndRemoveTask()`

## Expected Behavior After Fix

| Action | Before | After |
|--------|--------|-------|
| Tap PDF shortcut from home | Opens PDF viewer | Opens PDF viewer |
| Press back button | Returns to One Tap app | Returns to home screen |
| Tap "Open with" button | Opens external app | Opens external app |

