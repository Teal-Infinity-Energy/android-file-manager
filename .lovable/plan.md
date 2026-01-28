
## Back Button Navigation Enhancement Plan

This plan addresses the issue where pressing the Android back button in multi-step flows (like creating a scheduled reminder) exits the entire journey instead of navigating back one step at a time.

---

### Problem Summary

Currently, the back button properly closes sheets and dialogs that are registered with `useSheetBackHandler`, but multi-step flows inside those sheets (like the Reminder Creator's destination → timing → confirm steps) are not registered. This causes the back button to close the entire sheet rather than stepping back within the flow.

---

### Changes Overview

| File | Change |
|------|--------|
| `ScheduledActionCreator.tsx` | Register internal steps with back handler |
| `ScheduledActionEditor.tsx` | Register internal steps with back handler |
| `SavedLinksSheet.tsx` | Add back handler registration |
| `TrashSheet.tsx` | Register confirmation dialogs with back handler |

---

### Part 1: ScheduledActionCreator Back Button Support

**File:** `src/components/ScheduledActionCreator.tsx`

Add internal step registration so back button navigates within the flow:

1. Import `useSheetBackHandler` hook
2. Create a custom back handler that:
   - If on `urlSubStep`, clear it and stay on destination
   - If on `confirm` step, go back to `timing`
   - If on `timing` step with no `initialDestination`, go back to `destination`
   - If on `destination` step (or timing with initialDestination), allow closing

3. Register the "not on exit step" state with higher priority than the parent sheet

**Key Logic:**
```
shouldInterceptBack = (
  step !== 'destination' || 
  urlSubStep !== null || 
  (step === 'timing' && !initialDestination)
)
```

When `shouldInterceptBack` is true, register with the back handler to call `handleBack()` instead of closing the creator.

---

### Part 2: ScheduledActionEditor Back Button Support

**File:** `src/components/ScheduledActionEditor.tsx`

Similar approach to the Creator:

1. Import `useSheetBackHandler` hook
2. Register internal navigation state:
   - If on `destination` or `timing` step (not `main`), back button should go to `main`
   - If on `urlSubStep`, back button should clear the sub-step
3. Register with higher priority than the parent sheet

**Key Logic:**
```
shouldInterceptBack = (
  step !== 'main' || 
  urlSubStep !== null
)
```

---

### Part 3: SavedLinksSheet Back Button Registration

**File:** `src/components/SavedLinksSheet.tsx`

1. Import `useSheetBackHandler` hook
2. Add registration for the sheet when open
3. Handle form mode: if `showAddForm` is true, back button should close the form first

**Key Logic:**
- If `showAddForm` is true → close form (call `resetForm()`)
- Otherwise → close sheet (call `onOpenChange(false)`)

---

### Part 4: TrashSheet Confirmation Dialogs

**File:** `src/components/TrashSheet.tsx`

1. Import `useSheetBackHandler` hook
2. Register the confirmation dialogs with higher priority:
   - `showEmptyConfirm` dialog
   - `showDeleteConfirm` dialog  
   - `showRestoreAllConfirm` dialog

This ensures back button closes the confirmation dialog before closing the trash sheet.

---

### Technical Implementation Notes

- All internal step handlers should use a **higher priority** (e.g., 20) than sheet registrations (priority 0) to ensure they intercept first
- The hook already supports priority ordering: higher priority handlers are called first
- Callbacks should call the internal `handleBack()` functions that already exist in each component
- Use stable callback references with `useCallback` to avoid unnecessary re-registrations

---

### Testing Recommendations

After implementation, test these scenarios:

1. **Reminder Creation:**
   - Start creating a reminder → go to timing → press back → should return to destination (not close creator)
   - Go to confirm step → press back → should return to timing
   - On destination step → press back → should close creator

2. **Reminder Editing:**
   - Open editor → change destination → press back → should return to main view
   - Open editor → change timing → press back → should return to main view

3. **Saved Links Sheet:**
   - Open sheet → start adding a new link → press back → should close add form (not sheet)

4. **Trash Sheet:**
   - Open trash → tap "Empty Trash" → press back → should close confirmation dialog (not trash sheet)

