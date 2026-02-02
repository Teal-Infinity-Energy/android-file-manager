

## Fix Slideshow Tap Tracking: Remove Duplicate Count

### Problem Identified
The slideshow shortcut tap is being counted **twice**:

1. **Native side (correct)**: `SlideshowProxyActivity.java` calls `NativeUsageTracker.recordTap()` when the home screen shortcut is tapped
2. **Web side (duplicate)**: `SlideshowViewer.tsx` calls `incrementUsage()` when the viewer loads

This means every shortcut access is recorded twice in the usage history.

---

### Solution

Remove the `incrementUsage()` call from `SlideshowViewer.tsx` since the native layer already handles tap tracking correctly.

---

### Technical Changes

**File: `src/pages/SlideshowViewer.tsx`**

Remove line 68 (`incrementUsage(shortcutId)`) from the useEffect that loads shortcut data:

```tsx
// Before (lines 56-70):
if (shortcut && shortcut.type === 'slideshow') {
  setImages(shortcut.imageUris || []);
  setThumbnails(shortcut.imageThumbnails || []);
  setAutoAdvanceInterval(shortcut.autoAdvanceInterval || 0);
  setTitle(shortcut.name);
  
  if (shortcut.autoAdvanceInterval && shortcut.autoAdvanceInterval > 0) {
    setIsPlaying(true);
  }
  
  // Increment usage on view <-- REMOVE THIS LINE
  incrementUsage(shortcutId);
}

// After:
if (shortcut && shortcut.type === 'slideshow') {
  setImages(shortcut.imageUris || []);
  setThumbnails(shortcut.imageThumbnails || []);
  setAutoAdvanceInterval(shortcut.autoAdvanceInterval || 0);
  setTitle(shortcut.name);
  
  if (shortcut.autoAdvanceInterval && shortcut.autoAdvanceInterval > 0) {
    setIsPlaying(true);
  }
  // Usage is tracked by native SlideshowProxyActivity - no need to track here
}
```

Also remove `incrementUsage` from:
- The destructured hook values (line 19)
- The useEffect dependency array (line 70)

---

### Why This Works

The tracking flow will be:

1. User taps slideshow shortcut on home screen
2. `SlideshowProxyActivity` receives intent → calls `NativeUsageTracker.recordTap()`
3. Activity deep links to app with `onetap://slideshow/{id}`
4. App navigates to `SlideshowViewer` (no tracking here - it just displays)
5. On next app foreground, `syncNativeUsageEvents()` retrieves the native tap and records it in JS

This ensures **one tap = one count**, as intended.

