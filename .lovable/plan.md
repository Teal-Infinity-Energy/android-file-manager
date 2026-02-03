
# Fix Shortcut Sync on Android 12 (API 31+)

## Problem Analysis

The shortcut sync functionality is broken on Android 12 because when a user removes/unpins a shortcut from the home screen, the app is not detecting this change. Neither automatic sync nor manual sync button works.

### Root Cause

The previous fix registered shortcuts as dynamic shortcuts before pinning (to make them visible in `getPinnedShortcuts()` on Android 12+). However, there's a behavioral issue:

**On Android 12+, the ShortcutManager has inconsistent behavior:**
1. When a shortcut is unpinned from the home screen, Android doesn't immediately update the `isPinned()` state
2. The dynamic shortcut registration persists even after unpinning
3. `getPinnedShortcuts()` may return shortcuts that are still registered as dynamic but no longer pinned

### Platform Limitation

**Important**: Android does NOT provide a reliable way for apps to detect when a user removes a shortcut from the home screen. This is a known platform limitation. The `getPinnedShortcuts()` API may have stale data.

---

## Solution

Implement a multi-approach fix to improve detection accuracy on Android 12+:

### 1. Use `getShortcuts(FLAG_MATCH_PINNED)` on API 30+

The newer `getShortcuts(int matchFlags)` API (available since API 30) may provide more accurate filtering than the legacy `getPinnedShortcuts()`.

```java
@PluginMethod
public void getPinnedShortcutIds(PluginCall call) {
    // ... existing null checks ...
    
    List<ShortcutInfo> pinnedShortcuts;
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        // API 30+: Use newer getShortcuts with FLAG_MATCH_PINNED
        // This is more accurate on Android 12+
        pinnedShortcuts = manager.getShortcuts(ShortcutManager.FLAG_MATCH_PINNED);
    } else {
        // Legacy API for older Android versions
        pinnedShortcuts = manager.getPinnedShortcuts();
    }
    
    JSArray ids = new JSArray();
    
    for (ShortcutInfo info : pinnedShortcuts) {
        // Double-check isPinned() flag for accuracy
        if (info.isPinned()) {
            ids.put(info.getId());
        }
    }
    
    // Enhanced logging for debugging
    android.util.Log.d("ShortcutPlugin", 
        "getPinnedShortcutIds: API=" + Build.VERSION.SDK_INT + 
        ", total=" + pinnedShortcuts.size() + 
        ", pinned=" + ids.length());
    
    // ... resolve result ...
}
```

### 2. Clean Up Dynamic Shortcuts When Pinning Callback is Available

When a shortcut is successfully pinned, we should use the callback mechanism to confirm the pin succeeded. We already have this but the callback isn't being properly utilized.

### 3. Add Enhanced Debug Logging

Add comprehensive logging to diagnose the exact state being returned:

```java
// Log each shortcut's state
for (ShortcutInfo info : pinnedShortcuts) {
    android.util.Log.d("ShortcutPlugin", 
        "Shortcut: id=" + info.getId() + 
        ", isPinned=" + info.isPinned() + 
        ", isDynamic=" + info.isDynamic() + 
        ", isEnabled=" + info.isEnabled());
}
```

### 4. Fallback: Cross-reference with Dynamic Shortcuts

As an additional safeguard, cross-reference the dynamic shortcuts list to detect orphaned entries:

```java
// Get dynamic shortcuts to compare
List<ShortcutInfo> dynamicShortcuts = manager.getDynamicShortcuts();

// Log comparison for debugging
android.util.Log.d("ShortcutPlugin", 
    "Dynamic shortcuts count: " + dynamicShortcuts.size() + 
    ", Pinned shortcuts count: " + pinnedShortcuts.size());
```

---

## Files to Modify

| File | Change |
|------|--------|
| `native/android/app/src/main/java/app/onetap/shortcuts/plugins/ShortcutPlugin.java` | Update `getPinnedShortcutIds()` to use `getShortcuts(FLAG_MATCH_PINNED)` on API 30+, add `isPinned()` filter, and enhance logging |

---

## Technical Details

### Changes to `getPinnedShortcutIds()` Method

**Current implementation** (lines 3975-4022):
- Uses `manager.getPinnedShortcuts()` for all Android versions
- No filtering by `isPinned()` flag
- Basic logging only

**New implementation**:
1. Use `getShortcuts(FLAG_MATCH_PINNED)` on API 30+ for better accuracy
2. Explicitly filter results by `info.isPinned()` to catch any edge cases
3. Add detailed logging showing each shortcut's state (pinned, dynamic, enabled)
4. Include API level in logs for easier debugging

### Why This Should Work

1. **`getShortcuts(FLAG_MATCH_PINNED)`** is the modern API designed specifically for querying pinned shortcuts
2. **`isPinned()` filtering** provides a second layer of verification
3. **Enhanced logging** will help diagnose any remaining issues on specific devices

---

## Known Limitations (Cannot Fix)

1. **No Unpin Callback**: Android does not notify apps when a user unpins a shortcut. The OS simply doesn't provide this information reliably.

2. **Launcher Variability**: Different launchers (Samsung One UI, MIUI, Nova, etc.) may have different behaviors for reporting pinned shortcuts.

3. **Timing Issues**: There may be a delay between unpinning and the OS updating its internal state.

### User Impact

If sync still doesn't detect unpinned shortcuts on certain devices, users can:
1. Delete the shortcut from within the app (which properly cleans up both local and OS state)
2. The shortcut icon on home screen will show "deleted" message when tapped

---

## Testing Checklist

1. On Android 12 device:
   - Create a shortcut → verify it appears in My Access Points
   - Remove shortcut from home screen
   - Press sync button → verify shortcut is removed from list
   
2. On Android 13/14 device:
   - Same test as above

3. On older Android (8-11):
   - Verify existing behavior is not broken

---

## Summary

This fix improves shortcut sync accuracy on Android 12+ by:
1. Using the newer `getShortcuts(FLAG_MATCH_PINNED)` API
2. Adding explicit `isPinned()` filtering
3. Enhancing debug logging for diagnosing device-specific issues

The fix addresses the reported issue while acknowledging the platform limitation that Android doesn't reliably report unpin events.
