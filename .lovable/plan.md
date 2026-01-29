
# Plan: Make One Tap Access & Reminders Editable Everywhere

## Overview

This feature adds comprehensive editing capabilities for One Tap Access (home screen shortcuts) and One Tap Reminders across the entire app, including a long-press edit action directly from the home screen shortcut.

## Current State Analysis

### What Already Exists
- **Reminders are fully editable**: The `ScheduledActionEditor` component provides comprehensive editing for destination, timing, name, and description
- **Bookmark Library has editing**: Bookmarks can be edited via action sheet (title, URL, description, tags)
- **No shortcut editing exists**: The `useShortcuts` hook only has `createShortcut`, `deleteShortcut`, and `incrementUsage` - no update functionality

### Key Constraint
**Android Pinned Shortcuts Cannot Be Updated**: Once a pinned shortcut is placed on the home screen, Android does not allow modifying its intent, icon, or label. The only option is to create a new shortcut and let the user manually remove the old one.

## Use Cases for Editing

| Location | What Can Be Edited | Implementation |
|----------|-------------------|----------------|
| Home Screen Long-Press | Open app to edit screen | Deep link to edit flow |
| In-App Shortcut List | Name, icon, quick messages, contact | Edit sheet/page |
| Reminder Action Sheet | Full editing via existing editor | Already works |
| After Creation | All properties except content URI | New edit flow |

## Implementation Plan

### Phase 1: Data Layer - Add Update Capability

**File: `src/hooks/useShortcuts.ts`**

Add an `updateShortcut` function to modify existing shortcuts:

```typescript
const updateShortcut = useCallback((
  id: string,
  updates: Partial<Pick<ShortcutData, 'name' | 'icon' | 'quickMessages' | 'phoneNumber' | 'resumeEnabled'>>
) => {
  const updated = shortcuts.map(s => 
    s.id === id ? { ...s, ...updates } : s
  );
  saveShortcuts(updated);
}, [shortcuts, saveShortcuts]);
```

**Exported fields:**
- `name` - Shortcut display name
- `icon` - Icon (emoji, text, thumbnail)
- `quickMessages` - WhatsApp message templates
- `resumeEnabled` - PDF resume position toggle

### Phase 2: Native Android - Long-Press Edit Deep Link

**File: `native/android/.../ShortcutPlugin.java`**

When creating pinned shortcuts, add a secondary intent as "disabled message" that triggers when long-pressing, or use Android's shortcut configuration activity pattern:

```java
// In createPinnedShortcut method
ShortcutInfo.Builder builder = new ShortcutInfo.Builder(context, finalId)
    .setShortLabel(finalLabel)
    .setLongLabel(finalLabel)
    .setIcon(icon)
    .setIntent(intent);

// Add configuration activity for long-press edit
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    builder.setLongLived(true);
}
```

**New Activity: `ShortcutEditProxyActivity.java`**

A transparent activity that:
1. Receives the shortcut ID from the intent
2. Stores the pending edit request in SharedPreferences
3. Launches MainActivity with an `EDIT_SHORTCUT` deep link

```java
public class ShortcutEditProxyActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        String shortcutId = getIntent().getStringExtra("shortcut_id");
        if (shortcutId != null) {
            // Store pending edit
            SharedPreferences prefs = getSharedPreferences("onetap", MODE_PRIVATE);
            prefs.edit().putString("pending_edit_shortcut_id", shortcutId).apply();
            
            // Launch main app
            Intent mainIntent = new Intent(this, MainActivity.class);
            mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(mainIntent);
        }
        finish();
    }
}
```

### Phase 3: UI Components

#### 3a. Shortcut Edit Sheet
**New File: `src/components/ShortcutEditSheet.tsx`**

A bottom sheet for editing an existing shortcut:
- Name field with clear button
- Icon picker (emoji/text/thumbnail)
- Quick messages editor (for WhatsApp)
- PDF resume toggle (for PDFs)
- Save/Cancel buttons

```typescript
interface ShortcutEditSheetProps {
  shortcut: ShortcutData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: ShortcutUpdates) => void;
}
```

#### 3b. Shortcut Action Sheet
**New File: `src/components/ShortcutActionSheet.tsx`**

Similar to `BookmarkActionSheet` and `ScheduledActionActionSheet`:
- View details
- Edit (opens edit sheet)
- Create reminder from this shortcut
- Delete

#### 3c. Shortcuts List (In-App View)
**New File: `src/components/ShortcutsList.tsx`**

A scrollable list of all created shortcuts:
- Tap to view action sheet
- Long-press for selection mode
- Shows icon, name, type, usage count

### Phase 4: Deep Link Handler for Edit

**File: `src/hooks/usePendingShortcutEdit.ts`**

```typescript
export function usePendingShortcutEdit() {
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  useEffect(() => {
    async function checkPendingEdit() {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        const result = await ShortcutPlugin.getPendingEditShortcut();
        if (result.shortcutId) {
          setPendingEditId(result.shortcutId);
          await ShortcutPlugin.clearPendingEditShortcut();
        }
      } catch (error) {
        console.warn('Failed to check pending edit:', error);
      }
    }
    
    checkPendingEdit();
  }, []);

  return { pendingEditId, clearPendingEdit: () => setPendingEditId(null) };
}
```

### Phase 5: Integration in Index.tsx

**File: `src/pages/Index.tsx`**

```typescript
// Add pending edit detection
const { pendingEditId, clearPendingEdit } = usePendingShortcutEdit();
const [editingShortcut, setEditingShortcut] = useState<ShortcutData | null>(null);

// Handle pending edit from home screen long-press
useEffect(() => {
  if (pendingEditId) {
    const shortcut = shortcuts.find(s => s.id === pendingEditId);
    if (shortcut) {
      setEditingShortcut(shortcut);
    }
    clearPendingEdit();
  }
}, [pendingEditId, shortcuts]);
```

### Phase 6: Re-create Shortcut Option

Since Android pinned shortcuts cannot be updated, the edit flow will include a "Re-add to Home Screen" button that:
1. Creates a new shortcut with updated properties
2. Shows a toast: "Updated shortcut added. You can remove the old one from your home screen."

## User Experience Flow

### Editing from Home Screen
1. User long-presses shortcut on home screen
2. Android shows shortcut menu with "Edit" option (via disabled message or launcher support)
3. App opens directly to edit sheet for that shortcut
4. User makes changes and saves
5. If icon/name changed: prompted to re-add shortcut to home screen

### Editing from In-App
1. User navigates to "My Shortcuts" section (new)
2. Taps on any shortcut
3. Action sheet appears with Edit option
4. Edit sheet opens with all editable fields
5. User saves changes

### Editing Reminders
Already fully supported via `ScheduledActionEditor` - no changes needed.

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/ShortcutEditSheet.tsx` | Edit form for shortcuts |
| `src/components/ShortcutActionSheet.tsx` | Action menu for shortcuts |
| `src/components/ShortcutsList.tsx` | List view of all shortcuts |
| `src/hooks/usePendingShortcutEdit.ts` | Detect edit deep links |
| `native/.../ShortcutEditProxyActivity.java` | Handle long-press edit intent |

### Files to Modify
| File | Change |
|------|--------|
| `src/hooks/useShortcuts.ts` | Add `updateShortcut`, `getShortcut` functions |
| `src/plugins/ShortcutPlugin.ts` | Add edit-related methods |
| `native/.../ShortcutPlugin.java` | Add native edit methods |
| `native/.../AndroidManifest.xml` | Register ShortcutEditProxyActivity |
| `src/pages/Index.tsx` | Handle pending edits, show edit sheet |
| `src/i18n/locales/en.json` | Add edit-related translations |

### Android Shortcut Limitations
- **Pinned shortcuts are immutable**: Cannot change icon, label, or intent after creation
- **Workaround**: Provide "Re-add to Home Screen" button after edits
- **Long-lived shortcuts**: Mark shortcuts as `setLongLived(true)` for better launcher support

## Scope Exclusions
- Changing the content URI (file path, URL) of existing shortcuts - would break the shortcut
- Editing bookmark library entries - already implemented
- Editing reminder destinations - already implemented in `ScheduledActionEditor`
