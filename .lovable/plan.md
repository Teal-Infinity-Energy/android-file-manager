
# Premium Scheduled Timing Picker Redesign

## Overview
Transform the notification timing selection screen into a delightful, premium experience that makes choosing when to trigger a reminder feel effortless and intuitive. The current design is functional but utilitarian - the new design will feel polished, modern, and enjoyable to use.

## Current State Analysis
The existing `ScheduledTimingPicker` has:
- Basic recurrence selector (4 grid buttons)
- Horizontal scrolling date picker (14 days)
- Numeric time picker with up/down arrows
- AM/PM toggle buttons
- Simple preview section

**Pain Points:**
1. Time picker requires many taps to reach desired time
2. Date selector is small and requires scrolling
3. Visual hierarchy is flat - everything looks equally important
4. No smart defaults or quick-select options
5. Lack of premium visual polish (gradients, shadows, animations)

---

## New Design Concept

### Design Philosophy
- **"One-tap when possible"** - Provide smart shortcuts for common choices
- **"Progressive disclosure"** - Show simple options first, reveal advanced options on demand
- **"Delightful feedback"** - Subtle animations and haptic feedback for every interaction
- **Premium visual language** - Glassmorphism, gradients, smooth shadows

---

## Component Structure

### 1. Quick Time Presets (New Section)
Large, tappable cards for the most common scenarios:
- **"In 1 hour"** - Dynamic based on current time
- **"Tomorrow morning"** - 9:00 AM
- **"Tomorrow evening"** - 6:00 PM
- **"This weekend"** - Saturday 10:00 AM

These use a premium card style with gradient backgrounds, icons, and subtle shadows.

### 2. Custom Time Section (Redesigned)
Collapsible section that expands when user wants precise control:

**Date Selection:**
- Calendar-style week view showing 7 days at a time
- Selected date has animated highlight with gradient background
- Today and Tomorrow have special labels
- Swipe to see next/previous week

**Time Selection (Wheel/Drum Picker):**
- iOS-style scrollable wheels for hour, minute, and AM/PM
- Large touch targets with momentum scrolling
- Current selection highlighted with gradient bar
- Haptic feedback on each tick

**Recurrence Toggle:**
- Pill-style segmented control (Once | Daily | Weekly | Yearly)
- Selected state uses primary gradient fill
- Smooth slide animation between states

### 3. Live Preview Card (Enhanced)
- Floating card at bottom above the confirm button
- Shows formatted date/time with icon
- Animates when selection changes
- Shows recurrence info with subtle badge

---

## Visual Specifications

### Color & Effects
```
- Quick preset cards: bg-gradient-to-br from-primary/10 to-primary/5
- Selected states: bg-primary with white text
- Time wheel highlight: linear gradient with blur
- Card shadows: elevation-2 for depth
- Border radius: rounded-2xl (16px) for cards
```

### Typography
```
- Section labels: text-xs uppercase tracking-wider text-muted-foreground
- Quick preset titles: text-base font-semibold
- Time display: text-4xl font-bold tabular-nums
- Preview text: text-lg font-medium
```

### Animations
```
- Card press: scale-[0.98] with 150ms transition
- Selection change: fade-in-scale animation
- Section expand: accordion animation
- Time wheel: smooth momentum with spring physics
```

---

## Component Breakdown

### File Changes

**1. `src/components/ScheduledTimingPicker.tsx`** - Complete redesign:
- Add `QuickTimePresets` component for one-tap selections
- Replace numeric stepper with `TimeWheelPicker` component
- Replace horizontal scroll with `WeekCalendarPicker` component
- Add `RecurrenceSegmentedControl` component
- Enhanced `PreviewCard` with animations
- Add haptic feedback integration

**2. `src/components/ui/time-wheel-picker.tsx`** - New file:
- Touch-friendly scrollable wheel picker
- Support for hour (1-12), minute (0-59), period (AM/PM)
- Momentum scrolling with snap-to-value
- Visual highlight bar for current selection

**3. `src/i18n/locales/en.json`** - New translation keys:
```json
{
  "scheduledTiming": {
    "quickOptions": "Quick options",
    "inOneHour": "In 1 hour",
    "tomorrowMorning": "Tomorrow morning",
    "tomorrowEvening": "Tomorrow evening",
    "thisWeekend": "This weekend",
    "customTime": "Custom time",
    "selectDate": "Select date",
    "selectTime": "Select time",
    "repeatOption": "Repeat",
    "scheduledFor": "Scheduled for"
  }
}
```

---

## Implementation Flow

```text
+------------------------------------------+
|  Header: "When to remind you?"           |
+------------------------------------------+
|                                          |
|  QUICK OPTIONS                           |
|  +----------------+ +----------------+   |
|  | In 1 hour      | | Tomorrow 9 AM  |   |
|  | (icon) ~2:30PM | | (sun icon)     |   |
|  +----------------+ +----------------+   |
|  +----------------+ +----------------+   |
|  | Tomorrow 6 PM  | | This weekend   |   |
|  | (moon icon)    | | Sat 10 AM      |   |
|  +----------------+ +----------------+   |
|                                          |
|  ──────── or choose custom ────────      |
|                                          |
|  [Once] [Daily] [Weekly] [Yearly]        |
|                                          |
|  DATE                                    |
|  |Mon|Tue|Wed|Thu|Fri|Sat|Sun|          |
|  | 27| 28| 29| 30| 31|  1|  2|          |
|                                          |
|  TIME                                    |
|  +------+  +------+  +------+           |
|  |  09  |  |  00  |  |  AM  |           |
|  +------+  +------+  +------+           |
|                                          |
+------------------------------------------+
|  (preview) Tue, Jan 28 at 9:00 AM       |
|  [        Confirm        ]               |
+------------------------------------------+
```

---

## Technical Details

### Time Wheel Picker Implementation
- Uses CSS `scroll-snap-type: y mandatory` for smooth snapping
- Each option is a `div` with `scroll-snap-align: center`
- Intersection Observer to detect centered item
- Touch events for momentum handling
- Haptic feedback via `triggerHaptic('selection')` on value change

### Week Calendar Picker
- Shows 7 days in a row
- Left/right arrows to navigate weeks
- Today is marked with a dot indicator
- Selected date has gradient background with scale animation
- Includes month label that updates on scroll

### Quick Preset Logic
```typescript
const getQuickPresets = () => {
  const now = new Date();
  return [
    { 
      label: 'In 1 hour', 
      time: addHours(now, 1),
      icon: Clock 
    },
    { 
      label: 'Tomorrow morning', 
      time: setHours(addDays(now, 1), 9, 0),
      icon: Sun 
    },
    { 
      label: 'Tomorrow evening', 
      time: setHours(addDays(now, 1), 18, 0),
      icon: Moon 
    },
    { 
      label: 'This weekend', 
      time: getNextSaturday(10, 0),
      icon: Calendar 
    },
  ];
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/ScheduledTimingPicker.tsx` | Rewrite | Complete redesign with new UI |
| `src/components/ui/time-wheel-picker.tsx` | Create | New wheel picker component |
| `src/i18n/locales/en.json` | Update | Add new translation keys |

---

## Expected Outcome
- **Faster selection**: Quick presets allow one-tap scheduling for 80% of use cases
- **Premium feel**: Smooth animations, gradients, and haptic feedback
- **Better usability**: Wheel picker is more intuitive than steppers
- **Visual polish**: Modern design language consistent with the rest of the app
- **Accessibility**: Large touch targets, clear visual feedback

---

## Risk Assessment
- **Low complexity**: Uses existing Tailwind utilities and Framer Motion
- **No backend changes**: Pure frontend enhancement
- **Backward compatible**: Same props interface, just better UX
- **Easy to test**: Visual changes can be verified immediately
