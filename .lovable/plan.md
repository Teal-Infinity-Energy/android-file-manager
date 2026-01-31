

# WhatsApp Power Tools - Paid App Model

## Monetization Model

| Aspect | Details |
|--------|---------|
| Distribution | Google Play Store |
| Price | One-time purchase (~$4.99-9.99) |
| Model | Paid app - pay to download |
| Features | All features available to all users |

---

## What This Eliminates

| Removed | Reason |
|---------|--------|
| `usePremium` hook | No tiers to check |
| `PremiumGate` component | No feature gating |
| `UpgradePrompt` component | No upgrades |
| Feature limits | Everyone is "pro" |
| Google Play Billing code | No in-app purchases |
| `users_premium` table | No subscription tracking |
| Stripe integration | Not needed |
| Premium badges | Everything is premium |

---

## Simplified Implementation

### The Only Features to Build

1. **Scheduled WhatsApp Reminders**
   - Extend `ContactDestination` with `isWhatsApp` and `quickMessage`
   - Native notification routing to WhatsApp
   - UI for selecting WhatsApp vs Call in reminder creator

2. **Message Template Library**
   - `MessageTemplate` type with placeholders
   - `messageTemplatesManager.ts` for CRUD
   - Template library UI and editor
   - Integration in quick messages editor

3. **Contact Groups**
   - `ContactGroup` type
   - `contactGroupsManager.ts` for CRUD
   - Group editor UI
   - Native group chooser activity
   - Group shortcuts on home screen

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/types/messageTemplate.ts` | Template data types |
| `src/types/contactGroup.ts` | Contact group data types |
| `src/lib/messageTemplatesManager.ts` | Template CRUD operations |
| `src/lib/contactGroupsManager.ts` | Group CRUD operations |
| `src/hooks/useMessageTemplates.ts` | React hook for templates |
| `src/hooks/useContactGroups.ts` | React hook for groups |
| `src/components/MessageTemplateLibrary.tsx` | Template grid view |
| `src/components/MessageTemplateEditor.tsx` | Template create/edit |
| `src/components/ContactGroupEditor.tsx` | Group management |
| `src/components/ContactGroupGrid.tsx` | Group display |
| `native/.../GroupChooserActivity.java` | Native group picker dialog |

### Modified Files

| File | Change |
|------|--------|
| `src/types/scheduledAction.ts` | Add `isWhatsApp` and `quickMessage` to ContactDestination |
| `src/components/QuickMessagesEditor.tsx` | Add "Use template" button |
| `src/components/ScheduledActionCreator.tsx` | Add WhatsApp reminder option |
| `src/components/ContactShortcutCustomizer.tsx` | Add "Add to group" option |
| `src/lib/cloudSync.ts` | Add template and group sync |
| `native/.../NotificationClickActivity.java` | Handle WhatsApp reminder taps |
| `native/.../plugins/ShortcutPlugin.java` | Add group shortcut support |

### Cloud Sync Tables (Optional)

For users who sign in, sync templates and groups:

```sql
-- cloud_message_templates
CREATE TABLE public.cloud_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_id)
);

-- cloud_contact_groups
CREATE TABLE public.cloud_contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon_type TEXT NOT NULL,
  icon_value TEXT NOT NULL,
  contacts JSONB NOT NULL DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_id)
);
```

---

## Implementation Phases

### Phase 1: Scheduled WhatsApp Reminders
1. Extend `ContactDestination` type with WhatsApp fields
2. Update `ScheduledActionCreator` UI for WhatsApp option
3. Modify `NotificationClickActivity` to route to WhatsApp
4. Show WhatsApp icon on reminder items

### Phase 2: Message Template Library
1. Create template data model and storage manager
2. Build template library UI (grid with search)
3. Build template editor (create/edit with placeholder hints)
4. Integrate "Use template" in quick messages editor
5. Add template sync to cloud

### Phase 3: Contact Groups
1. Create group data model and storage manager
2. Build group editor UI
3. Build group grid display
4. Create native GroupChooserActivity
5. Add group shortcut creation
6. Add group sync to cloud

---

## Pricing Recommendation

| Price | Positioning |
|-------|-------------|
| $4.99 | Accessible, impulse-friendly |
| $6.99 | Middle ground |
| $9.99 | Premium positioning |

For a WhatsApp power-user tool targeting professionals, **$4.99-6.99** is likely optimal - low enough to not require approval, high enough to signal quality.

---

## What Stays the Same

- All existing features (shortcuts, reminders, bookmarks)
- Local-first architecture
- Optional cloud sync for signed-in users
- Calm UX philosophy
- No automation, no background activity

The paid model simply means everyone gets the full experience from day one.

