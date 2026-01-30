
# Plan: Redesign List Item Layout for Proper Overflow Handling

## Problem Summary

List items across the app (BookmarkItem, ScheduledActionItem, ShortcutListItem, TrashItem) have layout issues where:

1. The outermost container can overflow the screen width
2. When titles are collapsed (truncated), they still appear "too big" and push right-side elements (badges, chevrons, switches) off-screen
3. The `min-w-0` utility is applied but nested flex structures break the constraint inheritance

## Root Cause Analysis

The issue stems from nested flex containers where:

```
Parent [w-full]
  -> Flex Container [flex, items-start, gap-3]
       -> Icon [shrink-0, h-10, w-10]
       -> Content [flex-1, min-w-0] <-- This works
            -> Title [truncate] <-- This should truncate but...
            -> Badge/Meta Row [flex]
                 -> Badge [shrink-0] <-- This pushes content
       -> Right Actions [shrink-0] <-- These compete for space
```

The problem: When there are `shrink-0` elements (badges, chevrons, switches) alongside `flex-1` content, the content area doesn't shrink properly because `min-w-0` only applies to direct flex children, not nested elements.

## Solution: Constrained Content Layout

Apply a consistent pattern across all list items:

1. **Explicit width calculation** on the content container using `calc(100% - fixed_elements_width)`
2. **Add `overflow-hidden`** at every level that contains text
3. **Ensure `min-w-0`** is on every flex child that can contain text
4. **Move badges/metadata to a new line** to prevent horizontal overflow

### Layout Pattern

```
Container [w-full, overflow-hidden]
  -> Inner Flex [flex, items-start, gap-3, min-w-0]
       -> Icon [shrink-0, w-10]
       -> Content [flex-1, min-w-0, overflow-hidden]
            -> Title Row
                 -> Title [min-w-0, truncate OR break-all]
            -> URL/Subtitle [line-clamp-2, break-all]
            -> Metadata Row (new line, wrap allowed)
       -> Actions [shrink-0, ml-auto]
```

## File Changes

### 1. `src/components/BookmarkItem.tsx`

**Lines 307**: Add `min-w-0 overflow-hidden` to the clickable container
**Lines 330-334**: Ensure title has proper constraints

```tsx
// Line 307: Clickable content area
className="flex-1 flex items-start gap-3 min-w-0 overflow-hidden text-start active:scale-[0.99] transition-transform select-none cursor-pointer"

// Line 331-334: Title element with explicit min-w-0
<p 
  className={cn(
    "font-medium text-foreground cursor-pointer min-w-0",
    isTitleExpanded ? "break-all" : "truncate"
  )}
```

### 2. `src/components/ScheduledActionItem.tsx`

**Lines 286**: The main flex container needs `min-w-0` on the content wrapper
**Lines 312-326**: Title already has `min-w-0`, ensure parent has overflow constraint

```tsx
// Line 286: Main flex container
<div className="flex items-start gap-3 min-w-0">

// Line 312: Content wrapper - add overflow-hidden
<div className="flex-1 min-w-0 overflow-hidden">

// Line 362-371: Recurrence info row - ensure it doesn't overflow
<div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground min-w-0 overflow-hidden">
```

**Lines 374-386**: The toggle switch container needs to stay fixed width

```tsx
// Toggle switch container - ensure shrink-0 and fixed positioning
<div 
  className="flex items-center shrink-0 relative z-10 pt-2 ml-2" 
  onClick={handleToggleSwitch}
>
```

### 3. `src/components/ShortcutsList.tsx` (ShortcutListItem)

**Lines 137**: Button container - ensure overflow is handled
**Lines 144-165**: Restructure to prevent badge from pushing title off-screen

```tsx
// Line 137: Button container with strict overflow
<button className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card mb-2 hover:bg-muted/50 active:bg-muted transition-colors text-start shadow-sm overflow-hidden min-w-0">

// Lines 144-170: Restructured content area
<div className="flex-1 min-w-0 overflow-hidden">
  <div className="flex items-center gap-2 min-w-0">
    <p 
      className={cn(
        "font-medium min-w-0 cursor-pointer",
        isTitleExpanded ? "break-all" : "truncate"
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsTitleExpanded(!isTitleExpanded);
      }}
    >
      {shortcut.name}
    </p>
  </div>
  {/* Badge moved to second row to prevent overflow */}
  <div className="flex items-center gap-2 mt-1">
    <p className="text-xs text-muted-foreground truncate min-w-0 flex-1">
      {typeLabel}
      {target && ` · ${target}`}
    </p>
    <Badge 
      variant="outline" 
      className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-semibold bg-primary/5 border-primary/20 text-primary whitespace-nowrap"
    >
      {usageCount} {usageCount === 1 ? t('shortcuts.tap') : t('shortcuts.taps')}
    </Badge>
  </div>
</div>

// Line 172: Chevron stays at the end
<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 rtl:rotate-180" />
```

### 4. `src/components/TrashItem.tsx`

**Lines 162**: Main content container needs overflow control
**Lines 189-201**: Title needs min-w-0

```tsx
// Line 162: Main content flex
<div className="flex items-start gap-3 p-3 bg-muted/50 border border-border/50 min-w-0 overflow-hidden">

// Line 189: Content container
<div className="flex-1 min-w-0 overflow-hidden">

// Lines 190-201: Title with proper constraints
<p 
  className={cn(
    "text-sm font-medium text-foreground cursor-pointer min-w-0",
    isTitleExpanded ? "break-all" : "truncate"
  )}
>
```

**Lines 242-259**: Action buttons container stays fixed

```tsx
// Action buttons container - fixed width
<div className="flex items-center gap-1 shrink-0 flex-none">
```

## Summary of Key Changes

| File | Lines | Change |
|------|-------|--------|
| BookmarkItem.tsx | 307 | Add `min-w-0 overflow-hidden` to clickable area |
| BookmarkItem.tsx | 331 | Add `min-w-0` to title element |
| ScheduledActionItem.tsx | 286 | Add `min-w-0` to main flex container |
| ScheduledActionItem.tsx | 376 | Add `ml-2` spacing before switch |
| ShortcutsList.tsx | 137 | Add `overflow-hidden min-w-0` to button |
| ShortcutsList.tsx | 145-165 | Move badge to second row, restructure layout |
| TrashItem.tsx | 162 | Add `min-w-0 overflow-hidden` to main container |
| TrashItem.tsx | 191 | Add `min-w-0` to title element |

## Testing Checklist

- Create items with very long titles (50+ characters with no spaces)
- Verify collapsed titles show ellipsis and don't push other elements off-screen
- Tap to expand titles - verify they wrap without horizontal scrolling
- Check all four item types: Bookmarks, Trash, Reminders, Shortcuts
- Test on narrow viewport (320px width)
- Verify right-side elements (badges, switches, chevrons) remain visible
