
# Plan: Implement Chevron-Based Expandable Text Throughout App

## Overview

Replace all "tap-to-expand" text patterns with a consistent chevron icon approach. Text will be truncated after 30 characters with a visible chevron indicator that users tap to expand/collapse.

## Solution: Create Reusable ExpandableText Component

Create a single reusable component that handles:
- Character limit (30 chars default)
- Chevron visibility logic
- Expand/collapse animation
- Overflow protection

## Component Design

```text
+------------------------------------------+
| This is a long title that... ▼           |  (collapsed, >30 chars)
+------------------------------------------+

+------------------------------------------+
| This is a long title that exceeds        |  (expanded)
| thirty characters and wraps nicely    ▲  |
+------------------------------------------+

+------------------------------------------+
| Short title                              |  (no chevron, ≤30 chars)
+------------------------------------------+
```

## File Changes

### 1. NEW FILE: `src/components/ui/expandable-text.tsx`

Create a reusable component with these props:
- `text`: The text content
- `charLimit`: Number of characters before truncation (default: 30)
- `className`: Additional styling
- `expandedClassName`: Styling when expanded (e.g., `break-all`)
- `disabled`: Disable expansion (for selection mode)

```tsx
interface ExpandableTextProps {
  text: string;
  charLimit?: number;
  className?: string;
  expandedClassName?: string;
  disabled?: boolean;
  onClick?: () => void; // Haptic feedback hook
}
```

The component will:
1. Check if text length exceeds `charLimit`
2. If yes: show truncated text + chevron icon
3. If no: show full text, no chevron
4. Chevron rotates 180° on expand (spring animation)
5. Use `overflow-hidden` to prevent any overflow

### 2. UPDATE: `src/components/ShortcutsList.tsx`

Replace the title expansion logic in `ShortcutListItem`:

| Before | After |
|--------|-------|
| Entire title tappable | Only chevron triggers expand |
| No visual indicator | ChevronDown icon after 30 chars |
| `truncate` class toggle | ExpandableText component |

### 3. UPDATE: `src/components/BookmarkItem.tsx`

Replace title expansion:
- Use `ExpandableText` for title
- Keep existing URL expansion (already has chevron)
- Add `disabled` prop when in selection mode

### 4. UPDATE: `src/components/ScheduledActionItem.tsx`

Replace title expansion:
- Use `ExpandableText` for action name
- Keep existing description expansion (already has chevron pattern)
- Add `disabled` prop when in selection mode

### 5. UPDATE: `src/components/TrashItem.tsx`

Replace title expansion:
- Use `ExpandableText` for title
- Keep existing URL expansion (already has chevron)

## Technical Implementation

### ExpandableText Component Structure

```tsx
export function ExpandableText({
  text,
  charLimit = 30,
  className,
  expandedClassName = "break-all whitespace-normal",
  disabled = false,
  onClick,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > charLimit;

  const handleToggle = (e: React.MouseEvent) => {
    if (disabled || !shouldTruncate) return;
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    onClick?.(); // For haptic feedback
  };

  if (!shouldTruncate) {
    return <span className={cn("truncate", className)}>{text}</span>;
  }

  return (
    <div 
      className={cn("flex items-start gap-1 cursor-pointer min-w-0 overflow-hidden", className)}
      onClick={handleToggle}
    >
      <span className={cn(
        "flex-1 min-w-0",
        isExpanded ? expandedClassName : "truncate"
      )}>
        {text}
      </span>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="shrink-0"
      >
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
      </motion.div>
    </div>
  );
}
```

### Usage Example (ShortcutListItem)

```tsx
// Before
<p 
  className={cn(
    "font-medium w-full cursor-pointer",
    isTitleExpanded ? "break-all whitespace-normal" : "truncate"
  )}
  onClick={(e) => {
    e.stopPropagation();
    setIsTitleExpanded(!isTitleExpanded);
  }}
>
  {shortcut.name}
</p>

// After
<ExpandableText
  text={shortcut.name}
  charLimit={30}
  className="font-medium w-full"
  onClick={() => triggerHaptic('light')}
/>
```

## Benefits

1. **Consistent UX**: Same expand pattern across all list items
2. **Clear affordance**: Chevron shows text is expandable
3. **Overflow prevention**: Guaranteed no horizontal scroll
4. **Maintainability**: Single component to update
5. **Accessibility**: Visible indicator for interaction

## Files to Change

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/ui/expandable-text.tsx` | Create | New reusable component |
| `src/components/ShortcutsList.tsx` | Modify | Use ExpandableText for title |
| `src/components/BookmarkItem.tsx` | Modify | Use ExpandableText for title |
| `src/components/ScheduledActionItem.tsx` | Modify | Use ExpandableText for action name |
| `src/components/TrashItem.tsx` | Modify | Use ExpandableText for title |

## Testing Checklist

- Create items with titles exactly 30 characters - no chevron should appear
- Create items with 31+ character titles - chevron should appear
- Tap chevron to expand - text wraps, chevron rotates 180°
- Tap again to collapse - text truncates, chevron rotates back
- In selection mode - expansion should be disabled
- Landscape mode - no horizontal overflow
- RTL mode - chevron position and layout correct
