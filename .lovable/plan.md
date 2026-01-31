
# WhatsApp Power Tools - Premium Tier Design

## Executive Summary

This plan designs a premium tier ("WhatsApp Power Tools") that doubles down on the app's strongest differentiator: making WhatsApp communication effortless for professionals who message frequently. The tier is built around three core pillars:

1. **Scheduled Message Reminders** - "Remember to message Sarah about the meeting tomorrow at 9am"
2. **Message Template Library** - Reusable templates with placeholders and categories
3. **Contact Groups** - Smart groupings for batch operations

---

## Design Philosophy

### Alignment with Product Ideology

| Principle | How Premium Tier Respects It |
|-----------|------------------------------|
| Local-first | All premium data stored locally first, cloud sync optional |
| No automation | Scheduled reminders are **notifications**, not auto-sends |
| Calm UX | Premium features reduce friction, don't add cognitive load |
| User sovereignty | User always has final control - nothing happens without their tap |

### Monetization Model: Freemium

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 5 quick messages per contact, 3 contact shortcuts total, basic reminders |
| **Pro** | $4.99/month or $29.99/year | Unlimited messages, unlimited contacts, template library, contact groups |

---

## Feature 1: Scheduled WhatsApp Reminders

### What It Does

Users schedule a reminder to message a specific contact at a specific time. When the notification fires, tapping it opens WhatsApp with the chosen contact and optionally a pre-filled message.

### Technical Architecture

**Data Model Extension** (`src/types/scheduledAction.ts`):
```typescript
export interface ContactDestination {
  type: 'contact';
  phoneNumber: string;
  contactName: string;
  photoUri?: string;
  // NEW: WhatsApp-specific fields for reminders
  quickMessage?: string;      // Pre-filled message when reminder fires
  isWhatsApp: boolean;        // true = WhatsApp, false = call
}
```

**Native Notification Enhancement**:
When a WhatsApp reminder notification is tapped, it routes through a modified `NotificationClickActivity` that opens WhatsApp directly:
- Extracts destination data from notification extras
- Builds `wa.me/{phoneNumber}?text={encodedMessage}` URL
- Opens via `ACTION_VIEW` intent

**UI Changes**:
- Add "Message via WhatsApp" option in `ScheduledActionCreator` when contact is selected
- Show WhatsApp icon on reminder items with `isWhatsApp: true`
- Allow selecting one of the contact's existing quick messages as the pre-fill

### Free vs Pro Limits

| Feature | Free | Pro |
|---------|------|-----|
| WhatsApp reminders | 3 active | Unlimited |
| Reminder recurrence | Once only | Daily, weekly, yearly |

---

## Feature 2: Message Template Library

### What It Does

A centralized library of reusable message templates that can be:
- Organized into categories (Sales, Personal, Support, etc.)
- Used across any WhatsApp contact
- Include simple placeholders like `{name}` and `{date}`

### Technical Architecture

**New Data Type** (`src/types/messageTemplate.ts`):
```typescript
export interface MessageTemplate {
  id: string;
  name: string;              // "Follow-up after meeting"
  content: string;           // "Hi {name}, great meeting you! Let's..."
  category: string;          // "Sales" | "Personal" | "Custom"
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

// Placeholder system - simple string replacement
export const PLACEHOLDERS = [
  { key: '{name}', description: 'Contact name' },
  { key: '{date}', description: 'Today\'s date' },
  { key: '{time}', description: 'Current time' },
] as const;
```

**Storage** (`src/lib/messageTemplatesManager.ts`):
- localStorage key: `whatsapp_templates`
- CRUD operations mirroring `savedLinksManager.ts` patterns
- Category management with default categories

**UI Components**:
- `MessageTemplateLibrary.tsx` - Grid view of templates with search
- `MessageTemplateEditor.tsx` - Create/edit with placeholder hints
- Integration in `QuickMessagesEditor.tsx` - "Use template" button
- Integration in `MessageChooserSheet.tsx` - Show templates alongside quick messages

### Free vs Pro Limits

| Feature | Free | Pro |
|---------|------|-----|
| Templates | 3 total | Unlimited |
| Categories | 1 (General) | Unlimited custom |
| Placeholders | None | Full placeholder support |

---

## Feature 3: Contact Groups

### What It Does

Group contacts together for:
- Quick access from one shortcut (opens group view, tap to message)
- Scheduled reminders that notify about multiple contacts
- Batch template application

### Technical Architecture

**New Data Type** (`src/types/contactGroup.ts`):
```typescript
export interface ContactGroup {
  id: string;
  name: string;              // "Sales Leads", "Family"
  icon: ShortcutIcon;        // Emoji or custom
  contacts: GroupContact[];
  createdAt: number;
  usageCount: number;
}

export interface GroupContact {
  phoneNumber: string;
  contactName: string;
  photoUri?: string;
  // Each contact in a group can have their own quick message
  quickMessage?: string;
}
```

**Storage** (`src/lib/contactGroupsManager.ts`):
- localStorage key: `contact_groups`
- Group CRUD with contact management
- Cloud sync via new `cloud_contact_groups` table

**Home Screen Integration**:
- New shortcut type: `type: 'group'`
- Tapping opens a lightweight native dialog listing contacts
- User taps contact → opens WhatsApp

**UI Components**:
- `ContactGroupEditor.tsx` - Add/remove contacts, set icon
- `ContactGroupGrid.tsx` - View groups in Access tab
- Native `GroupChooserActivity.java` - Lightweight contact picker on shortcut tap

### Free vs Pro Limits

| Feature | Free | Pro |
|---------|------|-----|
| Contact groups | 1 | Unlimited |
| Contacts per group | 3 | 20 |
| Group shortcuts | No | Yes |

---

## Technical Implementation

### New Database Tables

**users_premium** (subscription status):
```sql
CREATE TABLE public.users_premium (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Users can only read their own premium status
```

**cloud_message_templates** (template sync):
```sql
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
```

**cloud_contact_groups** (group sync):
```sql
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

### Premium Status Check

**New Hook** (`src/hooks/usePremium.ts`):
```typescript
export function usePremium() {
  const { user } = useAuth();
  const [tier, setTier] = useState<'free' | 'pro'>('free');
  
  // Check local storage first (offline support)
  // Then sync with cloud when online
  
  return {
    tier,
    isPro: tier === 'pro',
    limits: {
      quickMessagesPerContact: tier === 'pro' ? Infinity : 5,
      contactShortcuts: tier === 'pro' ? Infinity : 3,
      templates: tier === 'pro' ? Infinity : 3,
      contactGroups: tier === 'pro' ? Infinity : 1,
      // etc.
    },
    checkLimit: (feature: string, currentCount: number) => {...},
  };
}
```

### Limit Enforcement

**Non-blocking soft limits**:
- Free users can try features, see upgrade prompt when limit reached
- Never delete or lock existing data if user downgrades
- Premium status cached locally for offline access

**UI Integration**:
- `PremiumGate.tsx` - Wrapper that shows upgrade prompt or children
- Inline "Pro" badges next to premium features
- Premium settings section with subscription management

### Stripe Integration

- Use Lovable's Stripe connector for payments
- Edge function `check-subscription` to verify status
- Webhook handler for subscription events
- Grace period: 7 days after expiration before downgrading

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/types/messageTemplate.ts` | Template data types |
| `src/types/contactGroup.ts` | Contact group data types |
| `src/lib/messageTemplatesManager.ts` | Template CRUD |
| `src/lib/contactGroupsManager.ts` | Group CRUD |
| `src/hooks/usePremium.ts` | Premium status & limits |
| `src/hooks/useMessageTemplates.ts` | React hook for templates |
| `src/hooks/useContactGroups.ts` | React hook for groups |
| `src/components/MessageTemplateLibrary.tsx` | Template management UI |
| `src/components/MessageTemplateEditor.tsx` | Template create/edit |
| `src/components/ContactGroupEditor.tsx` | Group management UI |
| `src/components/PremiumGate.tsx` | Upgrade prompt wrapper |
| `src/components/PremiumBadge.tsx` | "Pro" indicator |
| `supabase/functions/check-subscription/index.ts` | Stripe status check |
| `native/.../GroupChooserActivity.java` | Native group picker |

### Modified Files

| File | Change |
|------|--------|
| `src/types/scheduledAction.ts` | Add `isWhatsApp` and `quickMessage` to ContactDestination |
| `src/components/QuickMessagesEditor.tsx` | Add "Use template" button |
| `src/components/ScheduledActionCreator.tsx` | Add WhatsApp reminder option |
| `src/components/ContactShortcutCustomizer.tsx` | Add "Add to group" option |
| `src/components/SettingsPage.tsx` | Add premium subscription section |
| `src/lib/cloudSync.ts` | Add template and group sync |
| `native/.../NotificationClickActivity.java` | Handle WhatsApp reminder taps |
| `native/.../ShortcutPlugin.java` | Add group shortcut support |

---

## Implementation Phases

### Phase 1: Foundation (1 week)
1. Premium infrastructure (`usePremium`, database tables, Stripe)
2. Limit enforcement system
3. Upgrade prompts and UI

### Phase 2: Scheduled WhatsApp Reminders (1 week)
1. Extend `ContactDestination` type
2. Native notification routing to WhatsApp
3. UI for selecting WhatsApp vs Call
4. Quick message pre-fill option

### Phase 3: Message Templates (1 week)
1. Template data model and storage
2. Template library UI
3. Integration with quick messages
4. Placeholder system

### Phase 4: Contact Groups (1 week)
1. Group data model and storage
2. Group editor UI
3. Native group chooser activity
4. Group shortcut creation

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WhatsApp API changes | Use only public `wa.me` links, no private APIs |
| Overcomplication | Start with scheduled reminders only, validate demand |
| User confusion | Clear upgrade prompts with value prop, not feature gates |
| Subscription churn | Annual discount, generous free tier, no data hostage |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Free → Pro conversion | 5% within 30 days |
| Pro retention (monthly) | 80% |
| Pro retention (annual) | 70% |
| Feature usage (templates) | 60% of Pro users use weekly |
| Feature usage (groups) | 40% of Pro users create 1+ group |

---

## What's NOT Included (Intentionally)

- **Auto-send messages** - Violates product philosophy
- **WhatsApp Business API** - Different product, different user
- **Read receipts/analytics** - Privacy concern, not our domain
- **Chatbot/AI responses** - Scope creep, not core value
- **Multi-platform messaging** - Focus wins, breadth loses
