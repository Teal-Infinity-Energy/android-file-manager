
# Add Hover and Pressed State Animations to Inline Picker Cards

## Overview
Enhance the visual feedback on all interactive picker cards in the Access tab by adding subtle hover effects and improved pressed state animations.

## Components to Update

### 1. ActionModeButton (Shortcut/Reminder cards)
**Current state:**
- Has `active:scale-[0.98]` for press
- No hover effects

**Enhancements:**
- Add hover background brightness/opacity change
- Add hover shadow elevation
- Add smooth transition for all properties

### 2. GridButton (Photo, Video, Audio, Document, Contact, Link)
**Current state:**
- Has `active:scale-[0.96]` for press
- Has `transition-all` but no hover effects

**Enhancements:**
- Add hover scale-up effect (`hover:scale-[1.02]`)
- Add hover shadow elevation increase
- Add hover background brightness change

### 3. SecondaryButton (Browse files, Saved bookmarks)
**Current state:**
- Has `active:scale-[0.98]` for press
- Has `transition-all duration-150`

**Enhancements:**
- Add hover background opacity change
- Add hover text color shift

### 4. Contact Mode Toggle Buttons (Call/Message)
**Current state:**
- Has `transition-all`
- Has conditional hover on inactive state

**Enhancements:**
- Add subtle scale effect on hover
- Improve transition timing

---

## Technical Implementation

### ActionModeButton Changes
```text
Current classes:
- "active:scale-[0.98] transition-transform"

New classes:
- "hover:bg-card/80 hover:shadow-md hover:border-border"
- "active:scale-[0.97] active:shadow-sm"
- "transition-all duration-150"
```

### GridButton Changes
```text
Current classes:
- "active:scale-[0.96] transition-all"

New classes:
- "hover:scale-[1.02] hover:shadow-md"
- "hover:bg-muted/60" (when not active)
- "active:scale-[0.96] active:shadow-none"
- "transition-all duration-150"
```

### SecondaryButton Changes
```text
Current classes:
- "active:scale-[0.98] transition-all duration-150"

New classes:
- "hover:bg-muted/40 hover:text-foreground"
- "active:scale-[0.97]"
```

### Contact Mode Toggle Changes
```text
Add to inactive state:
- "hover:scale-[1.01]"
- Ensure smooth transitions
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ContentSourcePicker.tsx` | Update 4 button components with enhanced hover/pressed states |

---

## Animation Details

| Component | Hover Effect | Pressed Effect | Transition |
|-----------|--------------|----------------|------------|
| ActionModeButton | Lighter bg, shadow, border highlight | Scale down 0.97 | 150ms all |
| GridButton | Scale up 1.02, shadow, brighter bg | Scale down 0.96 | 150ms all |
| SecondaryButton | Darker bg, text color shift | Scale down 0.97 | 150ms all |
| Contact Toggle | Subtle scale 1.01 | Inherits existing | 150ms all |

This provides consistent, subtle feedback across all interactive elements while maintaining the existing Material Design-inspired aesthetic.
