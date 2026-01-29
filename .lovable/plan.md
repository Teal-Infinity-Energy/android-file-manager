
# Plan: Fix Text Overflow in My Shortcuts and Similar Components

## Problem Analysis

Based on the screenshot, the issue is that the shortcut metadata text (e.g., "Link · accubate-prod-public.s3.ap-south-1.amazonaws.co...") is overflowing horizontally, pushing the tap count badge ("0 taps") partially off-screen.

The root cause is that the current CSS layout doesn't properly constrain the content within the parent container. Even with `min-w-0` and `truncate` applied, the flex row containing the badge needs additional constraints.

## Solution

Apply a two-row layout where:
1. **Row 1**: Shortcut name (truncated) + tap count badge (fixed width, always visible)
2. **Row 2**: Type label + target URL (truncated, contained within bounds)

The key fix is moving the badge to be inline with the name (on the same row) and ensuring both rows have proper overflow handling.

## Files to Modify

### 1. `src/components/ShortcutsList.tsx` (Primary Fix)

**Current Issue**: The name row with badge doesn't properly constrain when text is long.

**Fix**:
- Ensure the parent container has explicit width constraints
- Use `overflow-hidden` at multiple levels
- Apply proper flex constraints so the name truncates before pushing the badge off-screen

**Layout Change**:
```
Before:
+--------------------------------------------------+
| [Icon] | Name                        | 0 taps |>|
|        | Link · very-long-url-that-overflows...  |
+--------------------------------------------------+

After:
+--------------------------------------------------+
| [Icon] | Name...              | 0 taps         |>|
|        | Link · very-long...                     |
+--------------------------------------------------+
```

### 2. Similar Patterns to Audit (No changes needed based on review)

The following components were reviewed and already handle text overflow correctly:

| Component | Status | Notes |
|-----------|--------|-------|
| `BookmarkItem.tsx` | OK | Uses `min-w-0` + `truncate`, URL has chevron expansion |
| `ScheduledActionItem.tsx` | OK | Uses `min-w-0` + `truncate` |
| `TrashItem.tsx` | OK | Uses `min-w-0` + `truncate`, URL has chevron expansion |
| `ClipboardSuggestion.tsx` | OK | Uses `min-w-0` + `truncate` |
| `SharedUrlActionSheet.tsx` | OK | Uses `min-w-0` + `truncate` |
| `ShortcutActionSheet.tsx` | Minor | Could add `truncate` to header, but low priority |

## Technical Details

### CSS Classes to Apply

```
Parent container (the button):
  - w-full (ensures full width)
  - overflow-hidden (clips overflowing children)

Text content wrapper:
  - flex-1 min-w-0 overflow-hidden (allows shrinking below content size)

Name row (with badge):
  - flex items-center gap-2 (horizontal layout)
  
Name text:
  - font-medium truncate flex-1 min-w-0 (truncates when space is limited)

Badge:
  - shrink-0 (never shrinks, always visible)
  - whitespace-nowrap (prevents text wrapping inside badge)

Metadata row:
  - text-xs text-muted-foreground truncate (single line, truncated)
```

### Key Insight

The issue occurs because:
1. The parent `button` doesn't have `overflow-hidden`
2. The flex container grows beyond the viewport when content is long

Adding `overflow-hidden` to the button element will clip any content that exceeds its bounds, forcing the truncation to work properly.

## Implementation Steps

1. Add `overflow-hidden` to the main button element in `ShortcutsList.tsx`
2. Verify the name properly truncates before pushing the badge off-screen
3. Ensure the metadata row (type + target) stays within bounds

## Testing

After implementation:
1. Open My Shortcuts on Android
2. Verify shortcuts with long names show truncated names with visible tap count
3. Verify shortcuts with long URLs show truncated URLs
4. Ensure the chevron icon remains visible on the right side
5. Test with different shortcut types (links, contacts, files)
