
# Fix: Android 15/16 NullPointerException in Video Player

## Problem Summary

The native video player crashes on **Android 15/16 (API 35-36)** devices, specifically Samsung devices, during `onCreate()`. The crash occurs because the code accesses `DecorView.getWindowInsetsController()` which returns null when the decor view isn't fully initialized.

**Error:**
```
java.lang.NullPointerException: Attempt to invoke virtual method 
'android.view.WindowInsetsController com.android.internal.policy.DecorView.getWindowInsetsController()' 
on a null object reference
```

**Root Cause:** The current implementation calls `decor.getWindowInsetsController()` on the DecorView, which fails on newer Android versions due to lifecycle timing. The DecorView may not be fully attached to the window yet.

---

## Solution

Replace the unsafe `DecorView.getWindowInsetsController()` pattern with the Android-15-safe `getWindow().getInsetsController()` approach, which retrieves the controller directly from the Window rather than from the DecorView.

---

## Implementation Details

### File to Modify
`native/android/app/src/main/java/app/onetap/shortcuts/NativeVideoPlayerActivity.java`

### Changes to `applyImmersiveModeSafely()` Method (Lines 278-325)

**Current problematic code:**
```java
View decor = null;
try {
    decor = getWindow().getDecorView();
} catch (Throwable ignored) {}

WindowInsetsController controller = null;
try {
    if (decor != null) controller = decor.getWindowInsetsController();
} catch (Throwable ignored) {}
```

**New Android-15-safe code:**
```java
WindowInsetsController controller = null;
try {
    controller = getWindow().getInsetsController();
} catch (Throwable ignored) {}
```

### Complete Rewritten Method

The `applyImmersiveModeSafely()` method will be updated to:

1. Use `getWindow().getInsetsController()` instead of `decor.getWindowInsetsController()`
2. Remove direct `DecorView` access for getting the controller
3. Keep a safe fallback to legacy system UI visibility flags for older devices
4. Maintain defensive null checks and try-catch blocks
5. Add a null URI guard in `onCreate()` to gracefully exit if no video URI is provided

---

## Technical Details

```text
┌─────────────────────────────────────────────────────────────┐
│                    applyImmersiveModeSafely()               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Android 11+ (API 30+):                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. setDecorFitsSystemWindows(false)                   │  │
│  │ 2. getWindow().getInsetsController() ← SAFE METHOD    │  │
│  │ 3. controller.hide(systemBars())                      │  │
│  │ 4. controller.setBehavior(TRANSIENT_BARS_BY_SWIPE)    │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│                    controller == null?                      │
│                           │                                 │
│            ┌──────────────┴──────────────┐                  │
│            ▼                             ▼                  │
│       Use legacy                   Apply modern             │
│    setSystemUiVisibility()          immersive mode          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Android < 11 (API < 30):                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Use legacy setSystemUiVisibility() flags              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Optional Safety Add-on

Add a defensive check in `onCreate()` to gracefully exit the activity if the incoming video URI is null, rather than showing the diagnostics screen which may not be fully initialized:

```java
if (videoUri == null) {
    logError("No video URI provided - exiting gracefully");
    Toast.makeText(this, "No video to play", Toast.LENGTH_SHORT).show();
    finish();
    return;
}
```

---

## Testing

After applying the fix:

1. Run `npx cap sync android`
2. Rebuild the app with Android Studio
3. Test on Android 15/16 devices (especially Samsung)
4. Verify video shortcuts launch the player successfully
5. Confirm fullscreen immersive mode works without crashes

---

## Files Changed

| File | Change |
|------|--------|
| `native/android/app/src/main/java/app/onetap/shortcuts/NativeVideoPlayerActivity.java` | Rewrite `applyImmersiveModeSafely()` to use `getWindow().getInsetsController()` instead of `DecorView.getWindowInsetsController()` |
