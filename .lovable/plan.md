
# Plan: Fix Title Tap-to-Expand Functionality

## Problem Analysis

The tap-to-expand feature for titles is not working correctly in `BookmarkItem.tsx`. When tapping on the title text, the parent button's `onClick` handler fires, opening the action sheet instead of toggling title expansion.

### Root Cause

In `BookmarkItem.tsx`, the clickable title `<p>` element is nested inside a `<button>` element (lines 294-380). This creates issues because:

1. Button elements have native click handling that can interfere with nested click handlers
2. The `handleClick` function on the parent button is being triggered despite `e.stopPropagation()` on the title
3. Touch events on mobile may behave differently than mouse events

### Component Comparison

| Component | Title Container | Title Expansion Works? |
|-----------|-----------------|------------------------|
| BookmarkItem | Nested inside `<button>` | No |
| TrashItem | Inside `<div>` | Yes |
| ScheduledActionItem | Inside `<div>` | Yes |

## Solution

Convert the outer `<button>` element in `BookmarkItem.tsx` to a `<div>` with proper accessibility attributes, matching the pattern used successfully in `TrashItem` and `ScheduledActionItem`.

### Technical Changes

**File: `src/components/BookmarkItem.tsx`**

1. **Change the clickable container from `<button>` to `<div>`**:
   - Replace `<button>` with `<div role="button" tabIndex={0}`
   - Add `onKeyDown` handler for keyboard accessibility (Enter/Space to activate)
   - Keep existing touch and mouse event handlers

2. **Why this works**:
   - `<div>` elements don't have native click capture behavior like `<button>`
   - `e.stopPropagation()` works reliably on nested elements
   - The `role="button"` and `tabIndex={0}` maintain keyboard accessibility
   - Pattern is already proven in `TrashItem` and `ScheduledActionItem`

### Code Changes

```
Lines 294-300 (approximate):
BEFORE:
  <button
    type="button"
    onClick={handleClick}
    onMouseDown={handleLongPressStart}
    onMouseUp={handleLongPressEnd}
    onMouseLeave={handleLongPressEnd}
    className="flex-1 flex items-start gap-3 text-start active:scale-[0.99] transition-transform select-none"
  >

AFTER:
  <div
    role="button"
    tabIndex={0}
    onClick={handleClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    }}
    onMouseDown={handleLongPressStart}
    onMouseUp={handleLongPressEnd}
    onMouseLeave={handleLongPressEnd}
    className="flex-1 flex items-start gap-3 text-start active:scale-[0.99] transition-transform select-none cursor-pointer"
  >

Lines 379-380 (approximate):
BEFORE:
        </button>

AFTER:
        </div>
```

## Files to Modify

- `src/components/BookmarkItem.tsx` - Convert inner `<button>` to `<div>` with proper ARIA attributes

## Testing Checklist

- Tap on bookmark title text - should toggle expansion (truncated vs full text)
- Tap on bookmark icon, URL area, or tags - should open action sheet
- Long press on bookmark - should enter selection mode
- Keyboard navigation (Tab + Enter) - should still activate bookmark
- Swipe-to-delete gesture - should continue working
- Selection mode tap behavior - should toggle selection correctly
