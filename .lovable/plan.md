
# Sync for Scheduled Reminders - Implementation Plan

## Current State Analysis

### Existing Sync Architecture
The app has a well-designed, "calm sync" system for bookmarks and trash:

- **Local Sovereignty**: Local `entity_id` (UUID) is the canonical identifier, never reassigned
- **Additive-Only**: Cloud operations only add items that don't exist locally (no overwrites)
- **Guarded Entry Points**: All sync operations go through `guardedSync()`, `guardedUpload()`, or `guardedDownload()`
- **Timing Constraints**: Auto-sync limited to once per 24 hours on foreground
- **Manual Trigger**: Always available via "Sync Now" button

### Current Cloud Tables
- `cloud_bookmarks`: Stores bookmarks with `entity_id`, `user_id`, URL, title, description, folder
- `cloud_trash`: Stores deleted items with retention metadata

### Scheduled Actions Data Model
```typescript
interface ScheduledAction {
  id: string;                              // Local UUID
  name: string;                            // Short, intent-based name
  description?: string;                    // Optional description
  destination: ScheduledActionDestination; // file | url | contact
  triggerTime: number;                     // Unix timestamp (ms)
  recurrence: RecurrenceType;              // once | daily | weekly | yearly
  enabled: boolean;
  createdAt: number;
  recurrenceAnchor?: RecurrenceAnchor;     // For computing next trigger
  // Notification tracking (local-only)
  lastNotificationTime?: number;
  notificationClicked?: boolean;
}
```

---

## Design Decisions

### What Should Sync?
| Field | Sync? | Rationale |
|-------|-------|-----------|
| `id` | ✅ As `entity_id` | Identity preservation across devices |
| `name` | ✅ | Core data |
| `description` | ✅ | Core data |
| `destination` | ✅ (JSONB) | Core data - stored as JSON object |
| `triggerTime` | ✅ | Essential for reminder function |
| `recurrence` | ✅ | Core data |
| `enabled` | ✅ | User intent |
| `createdAt` | ✅ | Original creation time |
| `recurrenceAnchor` | ✅ (JSONB) | For consistent next-trigger computation |
| `lastNotificationTime` | ❌ | Device-specific state |
| `notificationClicked` | ❌ | Device-specific state |

### Special Considerations

1. **File Destinations**: URIs like `content://...` are device-specific and will not resolve on other devices. Syncing preserves the data but users should understand file reminders are device-bound.

2. **Contact Photos**: `photoUri` in contact destinations is device-specific. The phone number and contact name will sync, but the photo may not appear on other devices.

3. **Trigger Time**: After download, recurring actions may need recalculation if the trigger time has passed. The app's existing `computeNextTrigger()` handles this.

---

## Implementation Plan

### Phase 1: Database Schema

Create a new `cloud_scheduled_actions` table:

```sql
CREATE TABLE IF NOT EXISTS public.cloud_scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  destination JSONB NOT NULL,
  trigger_time BIGINT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'once',
  recurrence_anchor JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  original_created_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_user_action UNIQUE (user_id, entity_id)
);

-- Enable RLS
ALTER TABLE public.cloud_scheduled_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern as bookmarks)
CREATE POLICY "Users can view own actions"
  ON public.cloud_scheduled_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own actions"
  ON public.cloud_scheduled_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions"
  ON public.cloud_scheduled_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own actions"
  ON public.cloud_scheduled_actions FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_cloud_scheduled_actions_updated_at
  BEFORE UPDATE ON public.cloud_scheduled_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Phase 2: Extend cloudSync.ts

Add internal upload/download functions for scheduled actions following the existing pattern:

```text
src/lib/cloudSync.ts changes:
├── Add CloudScheduledAction type
├── Add uploadScheduledActionsInternal()
│   └── Upsert local actions → cloud (by entity_id)
├── Add downloadScheduledActionsInternal()
│   └── Download cloud actions, merge missing → local
│   └── Recalculate trigger times for past-due recurring actions
├── Update performBidirectionalSync()
│   └── Include scheduled actions in upload phase
│   └── Include scheduled actions in download phase
└── Update guardedUpload/guardedDownload to include actions
```

**Key Implementation Details:**

```typescript
// Upload pattern (mirrors bookmarks)
async function uploadScheduledActionsInternal() {
  const localActions = getScheduledActions();
  for (const action of localActions) {
    await supabase.from('cloud_scheduled_actions').upsert({
      entity_id: action.id,
      user_id: user.id,
      name: action.name,
      description: action.description || null,
      destination: action.destination, // JSONB
      trigger_time: action.triggerTime,
      recurrence: action.recurrence,
      recurrence_anchor: action.recurrenceAnchor || null,
      enabled: action.enabled,
      original_created_at: action.createdAt,
    }, {
      onConflict: 'user_id,entity_id',
    });
  }
}

// Download pattern (mirrors bookmarks)
async function downloadScheduledActionsInternal() {
  const cloudActions = await supabase
    .from('cloud_scheduled_actions')
    .select('*')
    .eq('user_id', user.id);
    
  const existingIds = new Set(getScheduledActions().map(a => a.id));
  
  for (const cloudAction of cloudActions) {
    if (!existingIds.has(cloudAction.entity_id)) {
      // Create new local action
      // Recalculate trigger time if past-due and recurring
    }
  }
}
```

### Phase 3: Update Sync Status Tracking

Extend `syncStatusManager.ts` to track scheduled actions:

```typescript
interface SyncStatus {
  lastSyncAt: number | null;
  lastUploadCount: number;
  lastDownloadCount: number;
  // Add actions tracking
  lastActionsUploadCount?: number;
  lastActionsDownloadCount?: number;
  hasPendingChanges: boolean;
  pendingReason?: PendingReason;
  lastFailedAt?: number;
}
```

### Phase 4: UI Integration (Minimal)

Following the "calm" philosophy, **no new UI elements are needed**:

- The existing "Sync Now" button already triggers bidirectional sync
- The existing sync status indicator (green/amber dot) reflects overall sync state
- Auto-sync (daily on foreground) will automatically include scheduled actions

**Optional Enhancement** (low priority):
- Add actions count to the Profile page's sync stats display
- Format: "X bookmarks, Y reminders" in the local/cloud counters

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/cloudSync.ts` | Add scheduled actions upload/download functions |
| `src/lib/syncStatusManager.ts` | Add actions count tracking (optional) |
| `src/lib/scheduledActionsManager.ts` | No changes - existing CRUD is sufficient |
| `src/integrations/supabase/types.ts` | Will auto-update after migration |
| `supabase/migrations/` | New migration for cloud_scheduled_actions table |

---

## Edge Cases & Error Handling

1. **File URI Resolution**: File destinations will sync but may not resolve on other devices. The notification will fire but file access may fail gracefully.

2. **Past-Due Recurring Actions**: On download, if a recurring action's trigger time has passed, recalculate using `computeNextTrigger()`.

3. **One-Time Past Actions**: If a one-time action's trigger time has passed, download it as disabled to preserve history.

4. **Destination Type Validation**: Ensure destination JSONB parses correctly; skip invalid entries with console warning.

5. **Native Alarm Rescheduling**: After download, newly added actions need their native Android alarms scheduled. This happens automatically when the Reminders tab is opened (via `useScheduledActions` hook).

---

## Testing Checklist

- [ ] Create reminder → Sync → Verify appears in cloud table
- [ ] Sign in on second device → Sync → Verify reminders appear
- [ ] Edit reminder → Sync → Verify update propagates
- [ ] Delete reminder → Verify cloud entry is updated/removed
- [ ] Recurring reminder with past trigger time → Verify time recalculated on download
- [ ] File reminder sync → Verify data preserved (URI may not resolve)
- [ ] Contact reminder sync → Verify phone number preserved
- [ ] Auto-sync (24h) → Verify includes scheduled actions

---

## Expected Outcomes

- Scheduled reminders sync seamlessly with the existing "Sync Now" button
- No new UI complexity - follows the calm, invisible sync philosophy
- Local sovereignty preserved - cloud never overwrites local data
- Device-specific state (notification tracking) remains local
- Users on multiple devices see their reminders converge after sync
