

# Plan: Sync Shortcuts List with Home Screen Reality

## Problem

The "My Shortcuts" list shows all shortcuts ever created by the app, including ones that users have manually removed from their home screen. This creates confusion because the list is out of sync with what's actually on the home screen.

## Root Cause

When a user removes a shortcut directly from their Android home screen (long-press → Remove), the app has no way to know this happened. Android doesn't send any notification to the app. The shortcut remains stored in the app's data even though it no longer exists on the home screen.

## Solution

Add a sync mechanism that queries Android's ShortcutManager to find out which shortcuts are actually pinned on the home screen, then removes any orphaned entries from the app's storage.

## Technical Approach

### 1. Native Side - Query Pinned Shortcuts

Add a new method to `ShortcutPlugin.java` that returns the list of currently pinned shortcut IDs:

```java
@PluginMethod
public void getPinnedShortcutIds(PluginCall call) {
    ShortcutManager manager = context.getSystemService(ShortcutManager.class);
    List<ShortcutInfo> pinned = manager.getPinnedShortcuts();
    
    JSArray ids = new JSArray();
    for (ShortcutInfo info : pinned) {
        ids.put(info.getId());
    }
    
    JSObject result = new JSObject();
    result.put("ids", ids);
    call.resolve(result);
}
```

### 2. TypeScript Plugin Interface

Add the method to `ShortcutPlugin.ts`:

```typescript
getPinnedShortcutIds(): Promise<{ ids: string[] }>;
```

### 3. Sync Logic in useShortcuts Hook

Add a `syncWithHomeScreen` function that:
1. Calls native to get currently pinned shortcut IDs
2. Filters localStorage shortcuts to only include those that are still pinned
3. Updates localStorage with the filtered list

```typescript
const syncWithHomeScreen = useCallback(async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const { ids } = await ShortcutPlugin.getPinnedShortcutIds();
    const pinnedSet = new Set(ids);
    
    // Keep only shortcuts that are still pinned
    const synced = shortcuts.filter(s => pinnedSet.has(s.id));
    
    if (synced.length !== shortcuts.length) {
      saveShortcuts(synced);
      console.log('[useShortcuts] Synced with home screen, removed orphaned shortcuts');
    }
  } catch (error) {
    console.warn('[useShortcuts] Failed to sync with home screen:', error);
  }
}, [shortcuts, saveShortcuts]);
```

### 4. Trigger Sync on App Mount

Call `syncWithHomeScreen` when the app starts or when the ShortcutsList is opened, ensuring the list is always accurate.

## Files to Modify

| File | Change |
|------|--------|
| `native/.../ShortcutPlugin.java` | Add `getPinnedShortcutIds()` method |
| `src/plugins/ShortcutPlugin.ts` | Add TypeScript interface for new method |
| `src/plugins/shortcutPluginWeb.ts` | Add web stub |
| `src/hooks/useShortcuts.ts` | Add `syncWithHomeScreen()` function and call on mount |
| `src/components/ShortcutsList.tsx` | Optionally trigger sync when sheet opens |

## Behavior After Implementation

1. **On app start**: Automatically syncs shortcuts with home screen
2. **When opening "My Shortcuts"**: Shows only shortcuts that actually exist on home screen
3. **User removes shortcut from home screen**: Next app launch or list open will clean it up
4. **Seamless**: No user action required, happens automatically in background

## Edge Case: Usage History

The `usageHistoryManager` stores historical usage events separately. These events will reference shortcut IDs that may no longer exist. This is intentional - the usage history is for analytics/insights and should preserve historical data even after shortcuts are removed. No changes needed there.

## User Experience

- No breaking changes
- List becomes accurate and trustworthy
- Users see only shortcuts they can actually use
- Deleted shortcuts' usage history preserved for insights

