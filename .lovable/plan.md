
# Plan: Re-implement ShortcutsList Item Layout From Scratch

## Problem Analysis

The current implementation has several structural issues causing overflow:

1. **The button element is not properly constrained** - While it has `overflow-hidden`, the flexbox children aren't properly setting up width constraints
2. **The TruncatedText component uses `block` display** - But it's inside a flex container, causing layout conflicts
3. **The metadata row uses `flex-1` on the text span** - But the parent container doesn't enforce proper width inheritance
4. **Missing explicit width on flex containers** - The nested flex containers don't inherit width constraints properly

## Root Cause

The flex layout chain is broken:
```
button (flex, overflow-hidden) 
  → div (flex-1, min-w-0) 
    → TruncatedText (block, truncate) ← Problem: block inside flex parent
    → div (flex row)
      → span (flex-1) ← Problem: no explicit width constraint from parent
```

For truncation to work reliably, EVERY element in the chain from the constrained parent to the text must:
1. Have `min-w-0` (to allow shrinking below content size)
2. Have `overflow-hidden` (to clip content)
3. Use consistent display modes (not mixing block/inline in flex)

## Solution: Complete Rewrite of ShortcutListItem

I will completely rewrite the `ShortcutListItem` component with a proven pattern that uses:

1. **Explicit width constraints at every level**
2. **Pure inline-flex approach for text containers**
3. **Consistent overflow clipping chain**
4. **Simpler structure with fewer nested elements**

## New Layout Structure

```
button (w-full, flex, overflow-hidden)
├── div.icon (w-12, h-12, shrink-0)
├── div.content (flex-1, min-w-0, flex-col, overflow-hidden)
│   ├── span.title (block, truncate, w-full)
│   └── div.metadata (flex, w-full, overflow-hidden)
│       ├── span.type-target (truncate, flex-1, min-w-0)
│       └── Badge (shrink-0)
└── ChevronRight (shrink-0)
```

## Key Changes

### 1. Remove TruncatedText Component Usage (for this specific case)
- Use inline `<span className="truncate block w-full">` directly
- This eliminates the component abstraction that may introduce issues

### 2. Add Explicit Width Constraints
- Add `w-full` to the title span (not just `min-w-0`)
- Ensure the metadata container has `w-full` and `overflow-hidden`

### 3. Simplify the CSS Class Chain
- Remove redundant classes
- Use the minimal set: `flex-1 min-w-0 truncate` pattern consistently

### 4. Fix the Outer Container
- Ensure `SheetContent` constrains the width properly at the sheet level
- Add `overflow-x-hidden` at the sheet level itself

## File Changes

### `src/components/ShortcutsList.tsx`

#### A. Rewrite ShortcutListItem (lines ~119-169)

**New implementation:**
```tsx
function ShortcutListItem({ shortcut, onTap, t }) {
  const typeLabel = getShortcutTypeLabel(shortcut, t);
  const target = getShortcutTarget(shortcut);
  const usageCount = shortcut.usageCount || 0;
  
  return (
    <button
      onClick={() => onTap(shortcut)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card mb-2 hover:bg-muted/50 active:bg-muted transition-colors text-start shadow-sm overflow-hidden"
    >
      {/* Icon - fixed 48px, never shrinks */}
      <div className="shrink-0">
        <ShortcutIcon shortcut={shortcut} />
      </div>
      
      {/* Text content - must shrink, clips overflow */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Title - single line, truncates */}
        <span className="font-medium truncate w-full block">
          {shortcut.name}
        </span>
        
        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {typeLabel}{target && ` · ${target}`}
          </span>
          <Badge 
            variant="outline" 
            className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-semibold bg-primary/5 border-primary/20 text-primary"
          >
            {usageCount} {usageCount === 1 ? t('shortcuts.tap') : t('shortcuts.taps')}
          </Badge>
        </div>
      </div>
      
      {/* Chevron - fixed, never shrinks */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 rtl:rotate-180" />
    </button>
  );
}
```

#### B. Fix SheetContent Styling (line ~438)

Change:
```tsx
<SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col overflow-hidden max-w-full">
```

To:
```tsx
<SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col overflow-hidden w-full max-w-full">
```

#### C. Fix Inner List Container (line ~565)

Change:
```tsx
<div className="p-2 w-full max-w-full overflow-hidden">
```

To:
```tsx
<div className="p-2">
```
(The overflow is already handled by the ScrollArea and individual items)

### `src/components/ui/sheet.tsx`

#### Fix sheetVariants for Bottom Sheet (line ~37)

Add explicit width constraint for bottom sheets:

Change:
```tsx
bottom:
  "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
```

To:
```tsx
bottom:
  "inset-x-0 bottom-0 border-t w-full max-w-full overflow-x-hidden data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
```

## Summary of Files to Change

| File | Change Description |
|------|-------------------|
| `src/components/ShortcutsList.tsx` | Complete rewrite of `ShortcutListItem` with bulletproof overflow handling |
| `src/components/ui/sheet.tsx` | Add `w-full max-w-full overflow-x-hidden` to bottom sheet variant |

## Why This Will Work

1. **Explicit width chain**: `button (w-full)` → `div (flex-1)` → `span (w-full/flex-1)` ensures width is constrained at every level

2. **Consistent overflow clipping**: Every container that needs to shrink has both `min-w-0` (allow shrinking) and `overflow-hidden` (clip content)

3. **Simple structure**: Fewer nested elements means fewer places for the layout to break

4. **Direct text truncation**: Using `truncate` directly on the span containing text, not wrapped in another component

5. **Sheet-level constraint**: Bottom sheet itself has `overflow-x-hidden` so even if something escapes, it won't cause horizontal scroll

## Testing Checklist

After implementation:
- [ ] Short titles (< 30 chars) display normally
- [ ] Long titles without spaces truncate with ellipsis
- [ ] Long domains (S3 URLs) truncate with ellipsis
- [ ] Badge is always visible
- [ ] Chevron is always visible
- [ ] No horizontal scroll in portrait
- [ ] No horizontal scroll in landscape
- [ ] Filter chips scroll horizontally correctly
- [ ] Tapping item opens action sheet
