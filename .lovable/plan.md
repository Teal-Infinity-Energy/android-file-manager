

# Fix: Inline Picker Hidden Behind My Shortcuts Button

## Problem

When clicking "Browse all files" or "Saved bookmarks" in the General Options section, the expanded inline action picker (showing "Create Shortcut" and "Create Reminder" options) gets hidden beneath the fixed "My Shortcuts" button at the bottom of the screen.

## Root Cause

The component structure:
- Main container: `pb-28` (accounts for fixed button + bottom nav)
- Card with "More Options" section: `pb-4` at the bottom
- When secondary picker expands, it renders inside this section
- The fixed button position: `bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)]`

The `pb-28` padding on the outer container provides clearance, but it's static. When the inline picker expands within the card, the content grows but the card's bottom edge gets too close to (or under) the fixed button.

## Solution

Add dynamic bottom margin to the card when the secondary picker is active. This will push the card content up so the expanded picker remains fully visible above the fixed "My Shortcuts" button.

## Technical Changes

### File: `src/components/ContentSourcePicker.tsx`

**Change 1: Add dynamic margin to the main card when secondary picker is open**

At line 104, update the card's className to include conditional bottom margin:

```tsx
// Current (line 104):
<div className="rounded-2xl bg-card elevation-1 p-4">

// Change to:
<div className={cn(
  "rounded-2xl bg-card elevation-1 p-4",
  activeSecondaryPicker && "mb-24"
)}>
```

This adds `mb-24` (6rem / 96px) margin to the bottom of the card when the secondary picker is expanded, pushing the entire card content up and ensuring the inline picker options remain visible above the fixed button.

## Visual Result

| State | Before | After |
|-------|--------|-------|
| Secondary picker closed | Card ends normally | No change |
| Secondary picker open | Picker hidden under fixed button | Card gets extra bottom margin, picker fully visible |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ContentSourcePicker.tsx` | Add conditional `mb-24` class when `activeSecondaryPicker` is not null |

