

# Plan: Fix Gesture Conflict Between Text Scrolling and Swipe-to-Delete

## Problem

The `HorizontalScrollText` component uses native CSS `overflow-x-auto` for horizontal scrolling, while the parent containers (`BookmarkItem`, `TrashItem`) use custom touch event handlers for swipe-to-delete gestures. These two mechanisms compete for horizontal touch events, potentially causing:

- Accidental deletions when trying to scroll text
- Blocked text scrolling when the swipe gesture takes over
- Inconsistent user experience

## Solution: CSS `touch-action` Property

Use the CSS `touch-action` property to explicitly control which gestures are handled by the browser vs. JavaScript:

- **`touch-action: pan-y`** on `HorizontalScrollText`: Tells the browser to only handle vertical panning natively, allowing horizontal gestures to bubble up to the parent's JavaScript handlers
- This approach is simple, performant, and follows platform conventions

## Technical Details

```
┌─────────────────────────────────────────────────────────────┐
│  BookmarkItem (swipe handlers: onTouchStart/Move/End)       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  HorizontalScrollText (touch-action: pan-y)             ││
│  │  - Vertical scroll: handled by browser (page scroll)   ││
│  │  - Horizontal swipe: bubbles to parent JS handlers     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Trade-off

With `touch-action: pan-y`, the text will no longer horizontally scroll on its own. Instead:
- The **swipe-to-delete** gesture takes priority for horizontal movements
- Long text will show with **ellipsis** (already styled with `text-overflow: ellipsis`)
- Users can still read full content via expandable URL areas (where applicable)

This is the correct trade-off because:
1. Swipe-to-delete is a primary action that should never be accidentally blocked
2. The ellipsis provides visual indication of overflow
3. Critical content (like URLs) already has expandable sections

## Files to Modify

### `src/components/HorizontalScrollText.tsx`

Add `touch-action: pan-y` to prevent the component from capturing horizontal touch events, allowing parent swipe handlers to work reliably.

**Current:**
```tsx
<span
  className={cn(
    "block max-w-full min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap",
    "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    "[text-overflow:ellipsis]",
    className
  )}
  style={{ WebkitOverflowScrolling: "touch" }}
>
```

**Proposed:**
```tsx
<span
  className={cn(
    "block max-w-full min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap",
    "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    "[text-overflow:ellipsis]",
    // Prevent text scrolling from capturing horizontal swipes needed for parent gestures
    "touch-action-pan-y",
    className
  )}
  style={{ 
    WebkitOverflowScrolling: "touch",
    touchAction: "pan-y"  // Inline style as fallback
  }}
>
```

## Alternative Considered (Not Recommended)

An alternative approach would be to use `e.stopPropagation()` on the text element to completely isolate text scrolling from parent swipes. However, this would:
- Require more complex JavaScript touch handling
- Potentially break the swipe-to-delete feature entirely when touching text areas
- Create dead zones where swipe-to-delete doesn't work

## Testing Checklist

- Swipe-to-delete works reliably on bookmark items with long titles
- Swipe-to-delete works reliably on trash items with long titles  
- Swipe gestures in `ScheduledActionItem` (if present) still work
- Vertical scrolling of the list is not affected
- Long text displays with ellipsis as visual overflow indicator
- No accidental deletions occur when interacting with text

