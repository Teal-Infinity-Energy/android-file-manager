

## Disable Swipe Navigation When Forms Are Open

This plan implements disabling horizontal swipe navigation between tabs when the "Schedule Action" creator is open in the Reminders tab or when the "Add URL" form is open in the Bookmarks tab.

---

### Overview

When users are actively entering data in forms (URL input, action scheduling), accidental horizontal swipes should not switch tabs. This prevents frustrating data loss and improves the user experience.

---

### Technical Approach

The solution follows the existing pattern used for selection modes - child components will notify the parent (`Index.tsx`) when a form/overlay is open, and the parent will incorporate this state into the `swipeEnabled` calculation.

---

### Changes

#### 1. Update `NotificationsPage.tsx`

Add a new callback prop to notify the parent when the creator is open:

- Add prop: `onCreatorOpenChange?: (isOpen: boolean) => void`
- Call `onCreatorOpenChange?.(true)` when `showCreator` becomes true
- Call `onCreatorOpenChange?.(false)` when `showCreator` becomes false

#### 2. Update `BookmarkLibrary.tsx`

Add a new callback prop to notify the parent when the add form is open:

- Add prop: `onAddFormOpenChange?: (isOpen: boolean) => void`
- Call `onAddFormOpenChange?.(true)` when `showAddForm` becomes true
- Call `onAddFormOpenChange?.(false)` when `showAddForm` becomes false

#### 3. Update `Index.tsx`

Wire up the new state and disable swipe when forms are open:

- Add state: `const [isRemindersCreatorOpen, setIsRemindersCreatorOpen] = useState(false)`
- Add state: `const [isBookmarkFormOpen, setIsBookmarkFormOpen] = useState(false)`
- Pass new callbacks to child components
- Update swipe logic: `const swipeEnabled = showBottomNav && !isBookmarkSelectionMode && !isNotificationsSelectionMode && !isRemindersCreatorOpen && !isBookmarkFormOpen`

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add state tracking for form visibility and pass callbacks to children |
| `src/components/NotificationsPage.tsx` | Add `onCreatorOpenChange` prop and notify parent |
| `src/components/BookmarkLibrary.tsx` | Add `onAddFormOpenChange` prop and notify parent |

---

### Implementation Details

**NotificationsPage.tsx** will use a `useEffect` to watch `showCreator` and call the callback:

```typescript
useEffect(() => {
  onCreatorOpenChange?.(showCreator);
}, [showCreator, onCreatorOpenChange]);
```

**BookmarkLibrary.tsx** will use the same pattern:

```typescript
useEffect(() => {
  onAddFormOpenChange?.(showAddForm);
}, [showAddForm, onAddFormOpenChange]);
```

**Index.tsx** swipe enabled calculation becomes:

```typescript
const swipeEnabled = showBottomNav 
  && !isBookmarkSelectionMode 
  && !isNotificationsSelectionMode 
  && !isRemindersCreatorOpen 
  && !isBookmarkFormOpen;
```

This ensures consistent behavior where any focused input or multi-step form prevents accidental tab switches.

