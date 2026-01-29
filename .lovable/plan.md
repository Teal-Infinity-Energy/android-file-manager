

# Plan: Auto-Update Shortcuts for All Edit Types

## Problem Statement

The current `updatePinnedShortcut` implementation only updates **label and icon**, but shortcuts can have other editable properties that affect the **intent data**:

| Shortcut Type | Editable Properties | Stored In |
|---------------|---------------------|-----------|
| **WhatsApp** | Quick messages, phone number | Intent extras |
| **PDF** | Resume enabled | Intent extra |
| **Contact** | Phone number | Intent data |
| **URL/File** | Name, icon only | Label/Icon |

When a user edits WhatsApp quick messages, the home screen shortcut should update to include the new messages in its intent.

## Technical Limitation

Android's `ShortcutManager.updateShortcuts()` **does support updating the intent**, but with caveats:
- Works reliably for dynamic shortcuts that are also pinned
- For pinned-only shortcuts, the behavior varies by launcher
- The safest approach is to update with a complete `ShortcutInfo` including the intent

## Solution

Expand `updatePinnedShortcut` to accept **all editable properties** and rebuild the complete intent when needed. The native method will:
1. Receive the full shortcut data (type, phone number, quick messages, resume enabled, etc.)
2. Rebuild the correct intent based on shortcut type
3. Call `updateShortcuts()` with the complete `ShortcutInfo`

## Changes Required

### 1. Update TypeScript Interface (`src/plugins/ShortcutPlugin.ts`)

Expand the `updatePinnedShortcut` options to include all editable properties:

```typescript
updatePinnedShortcut(options: {
    id: string;
    label: string;
    iconEmoji?: string;
    iconText?: string;
    iconData?: string;
    // New: Intent-affecting properties
    shortcutType?: 'file' | 'link' | 'contact' | 'message';
    phoneNumber?: string;
    quickMessages?: string[];  // WhatsApp quick messages
    messageApp?: string;       // 'whatsapp' | 'telegram' etc.
    resumeEnabled?: boolean;   // PDF resume
    contentUri?: string;       // For file/link shortcuts
    mimeType?: string;
}): Promise<{ success: boolean; error?: string }>;
```

### 2. Update Web Fallback (`src/plugins/shortcutPluginWeb.ts`)

Add the new parameters to the web stub (no-op).

### 3. Update Native Plugin (`ShortcutPlugin.java`)

Modify `updatePinnedShortcut` to:
1. Parse new parameters (shortcutType, phoneNumber, quickMessages, etc.)
2. Rebuild the intent based on shortcut type (reusing logic from `createPinnedShortcut`)
3. Include the intent in the `ShortcutInfo.Builder`

Key code changes:
```java
@PluginMethod
public void updatePinnedShortcut(PluginCall call) {
    String shortcutId = call.getString("id");
    String label = call.getString("label");
    String shortcutType = call.getString("shortcutType");
    String phoneNumber = call.getString("phoneNumber");
    String messageApp = call.getString("messageApp");
    Boolean resumeEnabled = call.getBoolean("resumeEnabled", false);
    String contentUri = call.getString("contentUri");
    String mimeType = call.getString("mimeType");
    
    // Parse quick messages JSON array
    JSArray quickMessagesArray = call.getArray("quickMessages");
    String quickMessagesJson = quickMessagesArray != null ? 
        quickMessagesArray.toString() : null;
    
    // Build intent based on shortcut type
    Intent intent = null;
    if ("message".equals(shortcutType) && "whatsapp".equals(messageApp)) {
        // WhatsApp shortcut - route through proxy
        intent = new Intent(context, WhatsAppProxyActivity.class);
        intent.setAction("app.onetap.WHATSAPP_MESSAGE");
        intent.putExtra(EXTRA_PHONE_NUMBER, phoneNumber);
        intent.putExtra(EXTRA_QUICK_MESSAGES, quickMessagesJson);
        // ... etc
    } else if ("contact".equals(shortcutType)) {
        intent = new Intent(context, ContactProxyActivity.class);
        // ...
    }
    // ... other types
    
    // Build ShortcutInfo with intent
    ShortcutInfo.Builder builder = new ShortcutInfo.Builder(context, shortcutId)
        .setShortLabel(label)
        .setLongLabel(label)
        .setIcon(icon);
    
    if (intent != null) {
        builder.setIntent(intent);
    }
    
    manager.updateShortcuts(Collections.singletonList(builder.build()));
}
```

### 4. Update useShortcuts Hook (`src/hooks/useShortcuts.ts`)

Pass all relevant shortcut data to the native update:

```typescript
const updateShortcut = useCallback(async (id, updates) => {
    const updated = shortcuts.map(s => 
        s.id === id ? { ...s, ...updates } : s
    );
    saveShortcuts(updated);

    if (Capacitor.isNativePlatform()) {
        const shortcut = updated.find(s => s.id === id);
        if (shortcut) {
            // Determine if intent needs updating
            const needsIntentUpdate = 
                updates.quickMessages !== undefined ||
                updates.phoneNumber !== undefined ||
                updates.resumeEnabled !== undefined;

            await ShortcutPlugin.updatePinnedShortcut({
                id,
                label: shortcut.name,
                iconEmoji: shortcut.icon.type === 'emoji' ? shortcut.icon.value : undefined,
                iconText: shortcut.icon.type === 'text' ? shortcut.icon.value : undefined,
                iconData: shortcut.icon.type === 'thumbnail' ? shortcut.icon.value : undefined,
                // Intent data (only sent if intent needs updating)
                shortcutType: shortcut.type,
                phoneNumber: shortcut.phoneNumber,
                quickMessages: shortcut.quickMessages,
                messageApp: shortcut.messageApp,
                resumeEnabled: shortcut.resumeEnabled,
                contentUri: shortcut.contentUri,
                mimeType: shortcut.mimeType,
            });
        }
    }
}, [shortcuts, saveShortcuts]);
```

### 5. Update ShortcutEditSheet

The current code already passes `quickMessages` and `resumeEnabled` in the `updates` object, so minimal changes needed. Just ensure the `updateShortcut` signature allows `phoneNumber` updates too.

## Files to Modify

| File | Change |
|------|--------|
| `src/plugins/ShortcutPlugin.ts` | Expand `updatePinnedShortcut` interface |
| `src/plugins/shortcutPluginWeb.ts` | Update web fallback stub |
| `native/.../ShortcutPlugin.java` | Rebuild intent in `updatePinnedShortcut` |
| `src/hooks/useShortcuts.ts` | Pass full shortcut data to native |

## Shortcut Types Covered

| Type | Edits Auto-Updated |
|------|-------------------|
| **WhatsApp** | ✅ Name, icon, phone number, quick messages |
| **Contact** | ✅ Name, icon, phone number |
| **PDF** | ✅ Name, icon, resume enabled |
| **URL/Link** | ✅ Name, icon |
| **File (image/video)** | ✅ Name, icon |

## Edge Cases Handled

1. **No intent change needed** - If only name/icon changed, the intent is optional
2. **Launcher compatibility** - Some custom launchers may not refresh immediately; the "Re-Add" button remains as fallback
3. **Validation** - Proper null checks on all optional parameters

## User Experience

1. User opens "My Shortcuts"
2. Taps a WhatsApp shortcut → "Edit"
3. Changes quick messages (adds/removes/reorders)
4. Taps "Save"
5. The home screen shortcut updates automatically
6. Next tap opens WhatsApp with the new message options

