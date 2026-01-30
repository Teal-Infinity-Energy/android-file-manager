

## Goal
Convert the My Shortcuts sheet into a full-fledged page (single source of truth) and add a dedicated button in the Access tab to open it, positioned near the navigation bar for easy access.

## Current State Analysis
- **ShortcutsList.tsx** is currently a sheet component (`<Sheet>`) that opens from:
  - AppMenu (hamburger menu) via `onOpenShortcuts` callback
  - Deep link event `onetap:manage-shortcuts`
- **Index.tsx** manages the `shortcutsListOpen` state and renders the `<ShortcutsList>` sheet
- The component contains all the UI logic: search, type filters, sort controls, list rendering, action sheet, and edit sheet

## Architecture Changes

### 1. Create New Page: `src/pages/MyShortcuts.tsx`
- A new route `/my-shortcuts` for the dedicated page
- This page will use `useNavigate` for back navigation
- Contains a header with back button and title
- Wraps the core shortcuts content

### 2. Refactor `ShortcutsList.tsx` into `MyShortcutsContent.tsx`
- Extract the core content (search, filters, list, empty states) into a reusable component
- Remove the `<Sheet>` wrapper - the component becomes a pure content component
- Accept props for reminder creation callback and navigation-aware back handling
- Both the new page and any future inline usage can import this single source

### 3. Update Routing in `App.tsx`
- Add new route `/my-shortcuts` pointing to the new page (lazy-loaded)

### 4. Add Dedicated Button in Access Tab
- Add a floating action button (FAB) or fixed button near the bottom nav in `ContentSourcePicker.tsx`
- Positioned above the nav bar, distinct from other content
- Shows the Zap icon and shortcuts count badge
- Uses prominent styling to be distinguished from other options

### 5. Update Navigation Flow
- **From Access Tab**: Tapping the new button navigates to `/my-shortcuts`
- **From AppMenu**: Keep the existing menu item but navigate to the route instead of opening a sheet
- **Deep link**: Update to navigate to the route
- **Back navigation**: Return to the previous screen via router

## File Changes

### New Files
1. **`src/pages/MyShortcuts.tsx`** - New page component with header and content
2. **`src/components/MyShortcutsContent.tsx`** - Extracted core content (renamed from sheet logic)

### Modified Files
1. **`src/App.tsx`** - Add route `/my-shortcuts`
2. **`src/components/AccessFlow.tsx`** - Change `onOpenShortcuts` to use navigation
3. **`src/pages/Index.tsx`** - Remove sheet state, update handlers to use navigation
4. **`src/components/AppMenu.tsx`** - Update to use navigation
5. **`src/components/ContentSourcePicker.tsx`** - Add dedicated "My Shortcuts" button near bottom
6. **`src/components/ShortcutsList.tsx`** - Refactor to extract content, then delete or keep as thin wrapper if needed

### Deleted Files
- **`src/components/ShortcutsList.tsx`** - After extracting content to new component

## UI Design for Access Tab Button

The button will be placed in a fixed position at the bottom of the Access tab content, above the bottom navigation bar:

```
┌─────────────────────────────────┐
│  Access Tab Header              │
├─────────────────────────────────┤
│                                 │
│  Content Source Picker Grid     │
│  (Photo, Video, Audio, etc.)    │
│                                 │
│  Secondary Options              │
│  (Browse Files, Saved Bookmarks)│
│                                 │
├─────────────────────────────────┤
│  ⚡ My Shortcuts [badge]   →    │  <-- Distinguished button
├─────────────────────────────────┤
│  BottomNav (Tabs)               │
└─────────────────────────────────┘
```

Button styling:
- Full-width card with gradient background
- Primary accent color
- Zap icon + "My Shortcuts" label + count badge + chevron
- Elevated with shadow to stand out

## Technical Details

### MyShortcutsContent Props
```typescript
interface MyShortcutsContentProps {
  onCreateReminder: (destination: ScheduledActionDestination) => void;
  onNavigateBack?: () => void; // For page back button
  showHeader?: boolean; // Page provides its own header
}
```

### Navigation Updates
- Replace `setShortcutsListOpen(true)` with `navigate('/my-shortcuts')`
- Pass reminder callback via route state or context
- Use `useNavigate` for back button in the new page

### State Management for Reminders
When creating a reminder from shortcuts:
1. Navigate back to Index
2. Set `pendingReminderDestination` state
3. Switch to reminders tab
This can be achieved via:
- Route state: `navigate('/', { state: { reminder: destination, tab: 'reminders' } })`
- Or use a global context/store

## Implementation Order
1. Create `MyShortcutsContent.tsx` by extracting content from `ShortcutsList.tsx`
2. Create `MyShortcuts.tsx` page using the new content component
3. Add route to `App.tsx`
4. Add the dedicated button to `ContentSourcePicker.tsx`
5. Update `AccessFlow.tsx` to pass navigation callback
6. Update `Index.tsx` to handle incoming state and remove sheet
7. Update `AppMenu.tsx` to use navigation
8. Delete the old `ShortcutsList.tsx`

