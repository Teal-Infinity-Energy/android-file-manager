
# Landscape Optimization for Remaining Components

## Overview
Complete the landscape optimization across all remaining form components, sheets, dialogs, and overlays to ensure consistent horizontal space utilization and reduced vertical footprint throughout the app.

---

## Components to Optimize

### Category 1: Form Components & Dialogs

#### 1. AddBookmarkForm.tsx
**Current state:** Vertical stack of URL, title, description, tag selector, and save button
**Changes:**
- Reduce padding in landscape (`landscape:p-3`)
- Two-column layout for title + description in landscape
- Compact tag selector with smaller buttons (`landscape:py-0.5 landscape:px-2 landscape:text-[10px]`)
- Smaller save button (`landscape:h-9`)

#### 2. CreateFolderDialog.tsx
**Current state:** Single column with name input and icon picker
**Changes:**
- Add `landscape:max-h-[90vh]` to DialogContent
- Two-column grid: name input (left) + icon picker (right) in landscape
- Reduce footer button sizes (`landscape:h-9`)

#### 3. EditFolderDialog.tsx
**Current state:** Same as CreateFolderDialog
**Changes:**
- Mirror CreateFolderDialog optimizations
- Two-column layout in landscape

#### 4. FolderIconPicker.tsx
**Current state:** 6-column grid of icons
**Changes:**
- Expand to 9 columns in landscape (`landscape:grid-cols-9`)
- Smaller icon buttons (`landscape:p-2`)
- Compact icon size (`landscape:h-4 landscape:w-4`)

#### 5. BulkMoveDialog.tsx
**Current state:** Single column folder list
**Changes:**
- Two-column folder list in landscape (`landscape:grid-cols-2`)
- Reduce scroll area height (`landscape:h-[200px]`)
- Smaller buttons

---

### Category 2: Bottom Sheets

#### 6. BookmarkActionSheet.tsx
**Current state:** Full-width edit form with vertical stacking
**Changes:**
- Reduce header padding (`landscape:pb-2`)
- Two-column form layout in edit mode: URL + title (left), description + tags (right)
- Smaller action buttons (`landscape:h-10`)
- Compact tag pills (`landscape:px-2 landscape:py-0.5`)

#### 7. MessageChooserSheet.tsx
**Current state:** Vertical list of message options
**Changes:**
- Two-column message grid in landscape (`landscape:grid-cols-2`)
- Smaller message button icons (`landscape:h-8 landscape:w-8`)
- Reduced padding (`landscape:p-3`)
- Compact cancel button (`landscape:h-9`)

#### 8. ShortcutActionSheet.tsx
**Current state:** Already has `landscape:max-h-[95vh]` - minimal changes needed
**Changes:**
- Reduce button heights (`landscape:h-10`)
- Compact icon preview (`landscape:w-10 landscape:h-10`)
- Smaller separator margins

#### 9. ScheduledActionActionSheet.tsx
**Current state:** Vertical action list
**Changes:**
- Reduce header padding (`landscape:px-4 landscape:pb-3`)
- Smaller action header icon (`landscape:w-10 landscape:h-10`)
- Compact button heights (`landscape:h-10`)
- Reduced section padding

#### 10. TrashSheet.tsx
**Current state:** Full-height sheet with scrollable list
**Changes:**
- Reduce sheet height in landscape (`landscape:h-[75vh]`)
- Two-column action buttons in header (`landscape:flex-row`)
- Compact header icon (`landscape:h-8 landscape:w-8`)
- Smaller empty state illustration

#### 11. SavedLinksSheet.tsx
**Current state:** Large form area with vertical stacking
**Changes:**
- Reduce form padding (`landscape:p-3`)
- Two-column layout for add/edit form in landscape
- Compact link list items (`landscape:p-2`)
- Smaller search input height (`landscape:h-9`)

---

### Category 3: Floating UI Components

#### 12. SharedUrlActionSheet.tsx
**Current state:** Modal overlay with vertical form
**Changes:**
- Wider card in landscape (`landscape:max-w-lg`)
- Two-column action grid already exists - reduce button padding (`landscape:py-2`)
- Compact video thumbnail in landscape (`landscape:aspect-[2/1]`)
- Smaller form inputs in edit mode (`landscape:h-9`)
- Reduced spacing throughout (`landscape:space-y-3`)

#### 13. ClipboardSuggestion.tsx
**Current state:** Floating card with 2x2 action grid
**Changes:**
- Wider card in landscape (`landscape:max-w-lg`)
- Compact URL preview section (`landscape:p-2`)
- Smaller action buttons (`landscape:py-2`)
- Reduced form spacing in edit mode (`landscape:space-y-3`)
- Compact folder picker chips

---

### Category 4: Content Display

#### 14. ContentPreview.tsx
**Current state:** Horizontal layout with icon + text
**Changes:**
- Reduce padding (`landscape:p-2`)
- Smaller icon container (`landscape:h-10 landscape:w-10`)
- Compact text sizes (`landscape:text-xs` for sublabel)

---

### Category 5: Page Components

#### 15. OnboardingFlow.tsx
**Already has landscape optimization** - verify and enhance:
- Already uses `landscape:flex-row` for layout
- Already reduces icon sizes and padding
- No changes needed

#### 16. ContentSourcePicker.tsx
**Current state:** Already has some landscape optimization (6-column grid)
**Changes:**
- Compact action mode picker buttons (`landscape:p-2`)
- Smaller contact mode toggle (`landscape:py-2`)
- Reduce section padding (`landscape:p-3`)

---

## Implementation Pattern

All changes follow the established pattern:
```tsx
// Reduce spacing
className="space-y-6 landscape:space-y-3"

// Two-column layouts
className="landscape:grid landscape:grid-cols-2 landscape:gap-4"

// Compact elements
className="h-12 landscape:h-10"
className="p-4 landscape:p-3"
className="text-sm landscape:text-xs"
```

---

## Files to Modify

| Priority | File | Complexity |
|----------|------|------------|
| High | `src/components/AddBookmarkForm.tsx` | Low |
| High | `src/components/BookmarkActionSheet.tsx` | Medium |
| High | `src/components/SharedUrlActionSheet.tsx` | Medium |
| High | `src/components/ClipboardSuggestion.tsx` | Medium |
| Medium | `src/components/CreateFolderDialog.tsx` | Low |
| Medium | `src/components/EditFolderDialog.tsx` | Low |
| Medium | `src/components/FolderIconPicker.tsx` | Low |
| Medium | `src/components/MessageChooserSheet.tsx` | Low |
| Medium | `src/components/TrashSheet.tsx` | Medium |
| Medium | `src/components/SavedLinksSheet.tsx` | Medium |
| Low | `src/components/ShortcutActionSheet.tsx` | Low |
| Low | `src/components/ScheduledActionActionSheet.tsx` | Low |
| Low | `src/components/BulkMoveDialog.tsx` | Low |
| Low | `src/components/ContentPreview.tsx` | Low |
| Low | `src/components/ContentSourcePicker.tsx` | Low |

---

## Expected Outcomes
- Consistent landscape experience across all interactive components
- Reduced virtual keyboard overlap in form-based components
- Better utilization of horizontal space in sheets and dialogs
- Faster form completion with more fields visible simultaneously
- No changes to portrait mode behavior (all optimizations use `landscape:` prefix)
