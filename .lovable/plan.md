
# Add "Create Reminder" Option to Bookmark Library

## Overview

Add a "Create Reminder" / "Remind Later" option in the Bookmark Library that allows users to schedule a reminder for a saved URL. This feature will be available in two places:

1. **BookmarkActionSheet** - When tapping on a bookmark item
2. **Bulk Action Bar** - When exactly one bookmark is selected

This mirrors the existing "Create Shortcut" functionality which allows setting up home screen access.

---

## Architecture

The existing pattern is well-established:
- `Index.tsx` manages cross-tab navigation and passes `pendingReminderDestination` to `NotificationsPage`
- `onCreateReminder` callback receives a `ScheduledActionDestination` object
- Switching to the Reminders tab with a pre-filled destination opens the reminder creator

```text
┌──────────────────────┐
│   BookmarkLibrary    │
│                      │
│  onCreateReminder    │────▶ Index.tsx
│  (callback prop)     │      │
└──────────────────────┘      │
                              ▼
                    setPendingReminderDestination
                              │
                              ▼
                    setActiveTab('reminders')
                              │
                              ▼
                    ┌──────────────────────┐
                    │  NotificationsPage   │
                    │                      │
                    │ initialDestination   │
                    │    ▼                 │
                    │ Opens reminder       │
                    │ creator with URL     │
                    └──────────────────────┘
```

---

## Implementation Details

### 1. BookmarkLibrary.tsx

**Add new prop:**
```typescript
interface BookmarkLibraryProps {
  onCreateShortcut: (url: string) => void;
  onCreateReminder: (url: string) => void;  // NEW
  onSelectionModeChange?: (isSelectionMode: boolean) => void;
  clearSelectionSignal?: number;
  onActionSheetOpenChange?: (isOpen: boolean) => void;
}
```

**Add new handler:**
```typescript
const handleCreateReminder = (url: string) => {
  onCreateReminder(url);
};
```

**Update BookmarkActionSheet usage:**
```typescript
<BookmarkActionSheet
  ...
  onCreateReminder={handleCreateReminder}  // NEW
/>
```

**Add button to bulk action bar (when single selection):**
```typescript
{shortlistedLinks.length === 1 && (
  <>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => handleCreateReminder(shortlistedLinks[0].url)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={t('bookmarkAction.remindLater')}
        >
          <Bell className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t('bookmarkAction.remindLater')}</TooltipContent>
    </Tooltip>
    ...existing Edit and Home buttons...
  </>
)}
```

---

### 2. BookmarkActionSheet.tsx

**Add new prop:**
```typescript
interface BookmarkActionSheetProps {
  ...
  onCreateReminder: (url: string) => void;  // NEW
}
```

**Add new action button (after "Create Shortcut"):**
```typescript
{/* Create Reminder */}
<button
  onClick={() => handleAction(() => {
    onCreateReminder(link.url);
    onOpenChange(false);
  })}
  className="w-full flex items-center gap-3 p-3 landscape:p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
>
  <Bell className="h-5 w-5 landscape:h-4 landscape:w-4 text-muted-foreground" />
  <span className="font-medium landscape:text-sm">{t('bookmarkAction.remindLater')}</span>
</button>
```

---

### 3. Index.tsx

**Add handler:**
```typescript
const handleCreateReminderFromBookmark = useCallback((url: string) => {
  // Create UrlDestination and switch to reminders tab
  const destination: UrlDestination = {
    type: 'url',
    uri: url,
    name: url, // Will be parsed to hostname in NotificationsPage
  };
  setPendingReminderDestination(destination);
  setActiveTab('reminders');
}, []);
```

**Pass to BookmarkLibrary:**
```typescript
<BookmarkLibrary
  onCreateShortcut={handleCreateShortcutFromBookmark}
  onCreateReminder={handleCreateReminderFromBookmark}  // NEW
  ...
/>
```

---

### 4. Translation Key

Add to `en.json` under `bookmarkAction`:
```json
"remindLater": "Remind Later"
```

This reuses the existing translation key pattern already present in `sharedUrl` and `clipboard` sections.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/BookmarkLibrary.tsx` | Add `onCreateReminder` prop, handler, and bulk action bar button |
| `src/components/BookmarkActionSheet.tsx` | Add `onCreateReminder` prop and action button |
| `src/pages/Index.tsx` | Add `handleCreateReminderFromBookmark` handler and pass to BookmarkLibrary |
| `src/i18n/locales/en.json` | Add `bookmarkAction.remindLater` translation key |

---

## UI Placement

### Action Sheet Menu (BookmarkActionSheet)
```
┌─────────────────────────────────┐
│ Bookmark Title                  │
│ https://example.com/article     │
├─────────────────────────────────┤
│ 🔗 Open in Browser              │
│ ➕ Set Up Home Screen Access    │
│ 🔔 Remind Later         ← NEW  │
│ ✏️ Edit                         │
│ 🗑️ Move to Trash                │
│ 🗑️ Delete Permanently           │
└─────────────────────────────────┘
```

### Bulk Action Bar (single selection)
```
┌────────────────────────────────────────────────────┐
│  1 selected │ 📁  🔔  ✏️  🏠  🗑️  │ ✕ │
│             │         ↑                            │
│             │     NEW Bell                         │
└────────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Tap bookmark → Action sheet shows "Remind Later" option
- [ ] Tap "Remind Later" → Switches to Reminders tab with reminder creator pre-filled with URL
- [ ] Long-press to select one bookmark → Bulk bar shows Bell icon
- [ ] Tap Bell icon → Switches to Reminders tab with reminder creator pre-filled
- [ ] Complete reminder creation → Reminder saved with correct URL destination
- [ ] Both portrait and landscape modes display correctly
