

## Bug Fix: Toggle Button Not Updating in Action Sheet

### Problem
When toggling a scheduled reminder's enabled/disabled state from the action sheet, the toggle switch in the main list updates correctly, but the toggle in the action sheet itself stays stale (does not reflect the change).

### Root Cause
The action sheet receives a **snapshot** of the action object when opened. This snapshot is stored in `actionSheetAction` state and never updated when the underlying action data changes:

1. User taps an item, triggering `setActionSheetAction(action)` with a copy of that action
2. User toggles the switch in the sheet, which calls `onToggle(id)` 
3. The toggle handler updates the master `actions` array via `useScheduledActions`
4. The `actionSheetAction` state still holds the **old object** with the previous `enabled` value
5. The sheet's Switch component reads from this stale object

### Solution
Derive the fresh action data from the `actions` array using the stored action's ID instead of relying on the stale snapshot. This ensures the sheet always displays the current state.

---

### Technical Implementation

**File: `src/components/NotificationsPage.tsx`**

1. Store only the action ID instead of the full action object:
   - Change `actionSheetAction` state from `ScheduledAction | null` to `string | null` (storing just the ID)
   
2. Compute the fresh action using `useMemo`:
   - Look up the current action from the `actions` array by ID
   - This will automatically reflect any changes to the action's properties

3. Update related handlers and prop passing to work with the ID-based approach

**Changes Summary:**
- Rename `actionSheetAction` to `actionSheetActionId` (type: `string | null`)
- Add a computed `actionSheetAction` that finds the action from `actions` by ID
- Update `handleItemTap` to store just the ID
- Update `handleCloseActionSheet` and other handlers to clear the ID
- Keep all other logic unchanged

This approach ensures the sheet always displays fresh data while maintaining backward compatibility with the existing action sheet component.

