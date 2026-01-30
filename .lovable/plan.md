
# Fix: Back Button Not Properly Closing Shortcut Creation Journeys

## Problem Summary

When the back button is pressed during shortcut creation journeys (URL input → customize → success), the bottom navigation bar appears but the shortcut creation screens remain visible. This creates a confusing broken state.

## Root Cause

There's a **state synchronization issue** between `Index.tsx` and `AccessFlow.tsx`:

| Component | State Variable | Who Controls It |
|-----------|---------------|-----------------|
| `Index.tsx` | `accessStep` | Index itself |
| `AccessFlow.tsx` | `step` | AccessFlow itself |

The data flow is **one-directional**:
- AccessFlow notifies Index of step changes via `onStepChange` callback
- Index changes its `accessStep` on back button press
- But AccessFlow never receives this change - it only sends, never receives

When back is pressed:
1. Index sets `accessStep = 'source'`
2. `showBottomNav` becomes true (bottom nav appears)
3. AccessFlow still has `step = 'customize'` (shortcut creator stays visible)

## Solution

Register each sub-step of the shortcut creation journey with `useSheetBackHandler` inside `AccessFlow.tsx`. This ensures the back button properly navigates through the flow before Index.tsx's fallback logic is triggered.

## Technical Changes

### 1. Update `AccessFlow.tsx`

Register each journey step with the sheet back handler:

```tsx
// Import at top
import { useSheetBackHandler } from '@/hooks/useSheetBackHandler';

// Register each step with back handler (priority 10 to intercept before Index)
useSheetBackHandler(
  'access-url-step',
  step === 'url',
  handleGoBack,
  10
);

useSheetBackHandler(
  'access-customize-step',
  step === 'customize',
  handleGoBack,
  10
);

useSheetBackHandler(
  'access-contact-step',
  step === 'contact',
  handleGoBack,
  10
);

useSheetBackHandler(
  'access-success-step',
  step === 'success',
  handleReset,
  10
);
```

This ensures:
- When user is on `customize` step and presses back → `handleGoBack()` is called → navigates to `url` or `source`
- When user is on `url` step and presses back → `handleGoBack()` is called → navigates to `source`
- When user is on `success` step and presses back → `handleReset()` is called → full reset
- When user is on `contact` step and presses back → `handleGoBack()` is called → navigates to `source`

### 2. Remove Redundant Logic from `Index.tsx`

After AccessFlow handles its own back navigation, the fallback logic in Index.tsx (lines 340-355) becomes redundant. However, keeping it as a fallback is harmless and provides defense-in-depth.

Optionally, we can simplify or remove the access flow back navigation in Index.tsx since AccessFlow now handles it internally.

## Flow After Fix

```
User on Customize Step → Presses Back
├─ SheetRegistry checks for registered handlers
├─ Finds 'access-customize-step' registered (priority 10)
├─ Calls handleGoBack()
├─ AccessFlow.step changes to 'url' or 'source'
├─ AccessFlow notifies Index via onStepChange
└─ Index.accessStep updates → showBottomNav updates correctly
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AccessFlow.tsx` | Add 4 `useSheetBackHandler` calls for each journey step |

## Priority Hierarchy After Fix

| Priority | Handler | Purpose |
|----------|---------|---------|
| 30 | Confirmation dialogs | Close confirmations first |
| 20 | Sub-flow steps (creators/editors) | Close editing forms |
| 10 | **AccessFlow steps (NEW)** | Navigate back in shortcut journey |
| 0 | Sheets (trash, settings, etc.) | Close overlay sheets |
| -1 | Index fallback | Selection modes, exit confirmation |
