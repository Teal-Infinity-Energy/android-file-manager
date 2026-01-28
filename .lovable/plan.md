

## Missed Notifications System Enhancement Plan

This plan addresses three issues: adding missing translation keys, implementing notification click tracking, and improving the logic to distinguish between clicked and missed notifications.

---

### Overview

The missed notifications system currently cannot distinguish between notifications that were clicked vs. those that were truly missed. This enhancement will add proper tracking to provide accurate "missed" notifications and add the missing translation keys.

---

### Part 1: Add Missing Translation Keys

Add the `missedNotifications` section to the English bundle.

**File: `src/i18n/locales/en.json`**

Add after the `notificationsPage` section:

```json
"missedNotifications": {
  "title": "{{count}} Missed Reminder(s)",
  "title_one": "1 Missed Reminder",
  "title_other": "{{count}} Missed Reminders",
  "subtitle": "Tap to open or dismiss",
  "missed": "Missed",
  "reschedule": "Skip to next occurrence",
  "dismissAll": "Dismiss All"
}
```

---

### Part 2: Add Notification Status Tracking to Data Model

Extend the `ScheduledAction` type to track notification interactions.

**File: `src/types/scheduledAction.ts`**

Add new optional field to the `ScheduledAction` interface:

```typescript
export interface ScheduledAction {
  // ... existing fields
  
  // Notification tracking (added)
  lastNotificationTime?: number;   // When the notification was shown
  notificationClicked?: boolean;   // Whether user clicked it
}
```

---

### Part 3: Implement Click Tracking in Web Plugin

Update the web plugin to mark notifications as clicked when the user interacts with them.

**File: `src/plugins/shortcutPluginWeb.ts`**

In the `notification.onclick` handler, call a new function to mark the action as clicked:

```typescript
notification.onclick = () => {
  console.log('[ShortcutPluginWeb] Notification clicked, executing action');
  notification.close();
  // Mark as clicked before executing
  markNotificationClicked(actionId);
  this.executeWebAction(destinationType, destinationData);
};
```

**File: `src/lib/scheduledActionsManager.ts`**

Add function to mark notification as clicked:

```typescript
export function markNotificationClicked(id: string): void {
  updateScheduledAction(id, { notificationClicked: true });
}

export function markNotificationShown(id: string): void {
  updateScheduledAction(id, { 
    lastNotificationTime: Date.now(),
    notificationClicked: false 
  });
}
```

---

### Part 4: Update Missed Notifications Logic

Improve the hook to use the new tracking fields.

**File: `src/hooks/useMissedNotifications.ts`**

Update the `checkForMissedActions` function to only show actions where:
1. `triggerTime` has passed
2. `notificationClicked` is NOT true (meaning it wasn't acted upon)

```typescript
const pastDue = allActions.filter(action => {
  // Must be enabled and past-due
  if (!isPastDue(action)) return false;
  if (dismissedIds.has(action.id)) return false;
  
  // Skip if notification was clicked (user already acted on it)
  if (action.notificationClicked === true) return false;
  
  // Time window checks (existing logic)
  // ...
});
```

Also use `localStorage` instead of `sessionStorage` for dismissed IDs so they persist across app restarts.

---

### Part 5: Native Android Integration (for full solution)

For complete tracking on native Android, the notification click handler should communicate back to the JS layer.

**File: `native/android/app/src/main/java/app/onetap/shortcuts/NotificationHelper.java`**

When notification is clicked:
1. Update the action's `notificationClicked` flag in SharedPreferences
2. When the app opens, sync this data back to the JS layer

This requires:
- Modifying `buildActionIntent()` to include a flag indicating "launched from notification"
- Adding a new Capacitor plugin method like `getClickedNotificationIds()` that the JS can call on startup

---

### Implementation Sequence

1. Add translation keys (immediate fix for UI)
2. Extend `ScheduledAction` type with tracking fields
3. Update `scheduledActionsManager.ts` with mark functions
4. Update web plugin to mark notifications as clicked
5. Update `useMissedNotifications` to use new tracking logic
6. (Future) Implement native Android click tracking bridge

---

### Technical Notes

- **Backward compatibility**: The new fields are optional, so existing actions will continue to work
- **Storage change**: Consider using `localStorage` for dismissed IDs to persist across sessions, but keep them separate from the action's `notificationClicked` flag
- **One-time actions**: When clicked, they should be marked as clicked AND disabled
- **Recurring actions**: When clicked, mark as clicked, then reset `notificationClicked` to `false` when advancing to next trigger

