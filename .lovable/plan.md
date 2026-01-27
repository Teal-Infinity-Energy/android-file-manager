
# Fix: Date Selection Not Updating Trigger Time Correctly

## Problem Identified

The core issue is in the `computeNextTrigger` function in `scheduledActionsManager.ts`. For `once` recurrence, it **ignores the selected date** and only uses "today" or "tomorrow" based on whether the time has passed.

**Current Behavior (Broken):**
1. User selects February 15th at 9:00 AM
2. `anchor` is created with `{ dayOfMonth: 15, month: 1, hour: 9, minute: 0 }`
3. `computeNextTrigger` for `once` starts with `new Date(now)` (today, January 27)
4. Sets hours to 9:00 AM
5. If 9:00 AM has passed today → adds 1 day → **January 28th at 9:00 AM**
6. The selected date of February 15th is completely ignored

**Expected Behavior:**
- User selects February 15th at 9:00 AM → Trigger time should be February 15th at 9:00 AM

---

## Solution

Modify the `triggerTime` computation in `ScheduledTimingPicker.tsx` to **directly construct the timestamp from `selectedDate`** rather than relying on `computeNextTrigger`, which is designed for recurring action advancement (not initial creation).

### Approach: Compute trigger time directly in the component

Instead of calling `computeNextTrigger`, we build the timestamp directly:

```typescript
const triggerTime = useMemo(() => {
  const hour24 = get24Hour(hour, period);
  const result = new Date(selectedDate);
  result.setHours(hour24, minute, 0, 0);
  
  // If selecting today and the time has passed, bump to tomorrow
  if (recurrence === 'once' && result.getTime() <= Date.now()) {
    result.setDate(result.getDate() + 1);
  }
  
  return result.getTime();
}, [hour, minute, period, selectedDate, recurrence]);
```

This ensures:
- **Week calendar selection** → Correctly updates preview and trigger time
- **Full calendar selection** → Correctly updates preview and trigger time  
- **Quick presets** → Already work (they set `selectedDate` directly)
- **Daily recurrence** → Uses today's date with selected time

---

## File Changes

### 1. `src/components/ScheduledTimingPicker.tsx`

**Lines 379-389** - Replace the `triggerTime` computation:

```typescript
// Before (broken):
const triggerTime = useMemo(() => {
  const hour24 = get24Hour(hour, period);
  const anchor: RecurrenceAnchor = {
    hour: hour24,
    minute,
    dayOfWeek: selectedDate.getDay(),
    month: selectedDate.getMonth(),
    dayOfMonth: selectedDate.getDate(),
  };
  return computeNextTrigger(recurrence, anchor);
}, [hour, minute, period, selectedDate, recurrence]);

// After (fixed):
const triggerTime = useMemo(() => {
  const hour24 = get24Hour(hour, period);
  const result = new Date(selectedDate);
  result.setHours(hour24, minute, 0, 0);
  
  // For daily recurrence, we don't have a specific date - use today/tomorrow
  if (recurrence === 'daily') {
    const now = new Date();
    now.setHours(hour24, minute, 0, 0);
    if (now.getTime() <= Date.now()) {
      now.setDate(now.getDate() + 1);
    }
    return now.getTime();
  }
  
  // For one-time/weekly/yearly, if the exact datetime is in the past, handle it
  if (result.getTime() <= Date.now()) {
    if (recurrence === 'once') {
      // If the selected date+time is in the past, add 1 day as fallback
      result.setDate(result.getDate() + 1);
    } else if (recurrence === 'weekly') {
      // Move to next week
      result.setDate(result.getDate() + 7);
    } else if (recurrence === 'yearly') {
      // Move to next year
      result.setFullYear(result.getFullYear() + 1);
    }
  }
  
  return result.getTime();
}, [hour, minute, period, selectedDate, recurrence]);
```

**Remove unused import:**
- Remove `computeNextTrigger` from imports if no longer needed in this file

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Select today, time in future | Uses exact date+time |
| Select today, time in past | Bumps to tomorrow (for `once`) |
| Select future date | Uses exact date+time |
| Full calendar picks March 1 | Uses March 1 + selected time |
| Daily recurrence | Ignores date picker, uses today/tomorrow |
| Weekly recurrence, past day | Bumps to next week |
| Yearly recurrence, past date | Bumps to next year |

---

## Verification Points

After implementation, verify:
1. Quick preset "In 1 hour" → Preview shows correct time ~1 hour from now ✓
2. Week calendar: tap a future day → Preview updates to that day ✓
3. Full calendar: pick a date 2 weeks away → Preview shows that exact date ✓
4. Change time via wheel picker → Preview updates with same selected date ✓
5. Change recurrence → Preview adjusts appropriately ✓

---

## Summary

| Change | File | Lines |
|--------|------|-------|
| Fix `triggerTime` computation | `ScheduledTimingPicker.tsx` | 379-389 |

This is a focused fix that ensures all date selection modes (quick presets, week calendar, full calendar dialog) properly update the preview and trigger time logic.
