

# Fix: Secondary Picker Overlapping My Shortcuts Button

## Problem

When expanding the inline picker in the "General Options" section, the picker content overlaps with or hides beneath the fixed "My Shortcuts" button. The user wants the button to behave like the navigation bar - content should end above it with no overlap.

## Root Cause Analysis

Current layout structure:
```
<div className="pb-28">              <!-- Outer container with padding -->
  <div className="p-4">              <!-- Card -->
    <!-- Primary grid -->
    <!-- Secondary section -->
      <!-- Inline picker expands HERE, inside the card -->
    </div>
  </div>

  <!-- FIXED button - positioned on top of content -->
  <div className="fixed bottom-[...]">
    <MyShortcutsButton />
  </div>
</div>
```

Problems:
1. The button is **fixed** - it floats above the content, not part of the flow
2. The `pb-28` padding creates clearance for the **collapsed** state only
3. When the picker expands, it grows into that padding space and overlaps with the fixed button
4. Adding more margin (`mb-24`) doesn't solve it because the fixed button doesn't respond to content changes

## Solution

Change the My Shortcuts button from `fixed` positioning to normal document flow. Place it **after** the card in the container, so it naturally sits below all content. The existing `pb-28` on the outer container will provide clearance for the **navigation bar** only, while the button becomes part of the scrollable content.

## Technical Changes

### File: `src/components/ContentSourcePicker.tsx`

**Change 1: Remove the margin-bottom workaround** (lines 104-107)

```tsx
// Current:
<div className={cn(
  "rounded-2xl bg-card elevation-1 p-4",
  activeSecondaryPicker && "mb-24"
)}>

// Change to:
<div className="rounded-2xl bg-card elevation-1 p-4">
```

**Change 2: Change My Shortcuts button from fixed to flow** (lines 233-236)

```tsx
// Current:
{/* My Shortcuts Button - Fixed near bottom nav */}
<div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] left-0 right-0 px-5 z-10">
  <MyShortcutsButton />
</div>

// Change to:
{/* My Shortcuts Button - Part of content flow */}
<MyShortcutsButton />
```

Since the button is no longer fixed, it will naturally appear after the card content. The outer container's `pb-28` still provides clearance for the actual bottom navigation bar.

## Visual Result

| State | Before | After |
|-------|--------|-------|
| Secondary picker closed | Button fixed at bottom, content has gap | Button appears below card, content flows naturally |
| Secondary picker open | Picker expands under fixed button (OVERLAP) | Picker expands, button moves down with content (NO OVERLAP) |
| Scrolling | Button stays fixed while content scrolls | Button scrolls with content |

## Tradeoff

The button will no longer be "always visible" at the bottom - it becomes part of the scrollable content. This matches the user's request to treat it like the nav bar (content should not overlap with it).

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ContentSourcePicker.tsx` | Remove `mb-24` conditional, change button from fixed to flow positioning |

