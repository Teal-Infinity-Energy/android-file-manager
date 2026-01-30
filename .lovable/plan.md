

# Tap Tracking Analysis - Issues and Fixes

## Executive Summary

The tap tracking system has gaps where certain shortcut types are not properly recording usage events when tapped from the home screen. This analysis identifies **5 specific issues** that need to be fixed.

## How Tap Tracking Works

```text
Home Screen Tap
      │
      ▼
┌─────────────────┐
│  Proxy Activity │ ← Records tap via NativeUsageTracker.recordTap()
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Target Action  │ ← Opens browser, calls phone, launches WhatsApp, etc.
└─────────────────┘
      │
      ▼ (On next app launch)
┌─────────────────┐
│  JS Syncs       │ ← getNativeUsageEvents() retrieves and clears stored events
│  Usage Events   │
└─────────────────┘
```

## Current Proxy Coverage

| Shortcut Type | Proxy Activity | Tracking Status |
|---------------|----------------|-----------------|
| Video | VideoProxyActivity | Working |
| PDF | PDFProxyActivity | Working |
| Contact (Call) | ContactProxyActivity | Working |
| WhatsApp (2+ messages) | WhatsAppProxyActivity | Working |
| WhatsApp (0-1 message) | MessageProxyActivity | Working |
| Telegram | MessageProxyActivity | Working |
| Signal | MessageProxyActivity | Working |
| Slack | MessageProxyActivity | Working |
| Link (URL) | LinkProxyActivity | Working |

## Issues Identified

### Issue 1: Missing `shortcut_id` in `buildIntentForUpdate` for Several Proxy Types

**Severity: High**

When shortcuts are updated via `updatePinnedShortcut()`, the `buildIntentForUpdate()` method rebuilds the intent but **fails to include `shortcut_id`** for several proxy types:

**Affected proxies:**
- `WhatsAppProxyActivity` - Missing `EXTRA_SHORTCUT_ID`
- `ContactProxyActivity` - Missing `EXTRA_SHORTCUT_ID`
- `VideoProxyActivity` - Missing `shortcut_id` extra

**Impact:** Shortcuts that are edited (name, icon, phone number changes) lose their tap tracking capability. The proxy activity receives the tap but `shortcutId` is null, so `NativeUsageTracker.recordTap()` is not called.

**Root Cause:** Lines 3188-3237 in `ShortcutPlugin.java` - the `buildIntentForUpdate()` method builds intents but doesn't pass the shortcut ID to all proxies.

### Issue 2: `buildIntentForUpdate` Always Routes WhatsApp to Multi-Message Proxy

**Severity: Medium**

The `buildIntentForUpdate()` method at line 3188 routes ALL WhatsApp shortcuts (type="message" + messageApp="whatsapp") to `WhatsAppProxyActivity`, regardless of message count:

```java
if ("message".equals(shortcutType) && "whatsapp".equals(messageApp)) {
    // Always goes to WhatsAppProxyActivity
}
```

**Problem:** WhatsApp shortcuts with 0-1 messages should route through `MessageProxyActivity` (as they do during creation), but after an update they're incorrectly routed to `WhatsAppProxyActivity`.

**Impact:** Behavior inconsistency after editing a WhatsApp shortcut. The multi-message dialog may appear unexpectedly for single-message shortcuts.

### Issue 3: `buildIntentForUpdate` Missing Link Shortcut Support

**Severity: High**

The `buildIntentForUpdate()` method has no case for `type="link"` shortcuts. It only handles:
- message + whatsapp
- contact
- file (PDF)
- file (video)

**Problem:** When a link shortcut is edited, `buildIntentForUpdate()` returns `null`, so the shortcut's intent is not updated. The next tap may still work (original intent preserved), but the shortcut_id won't be refreshed if it was somehow lost.

More importantly, line 3238's comment says "For link/file types that don't need special handling, we don't rebuild the intent" - but this is wrong because link shortcuts DO need their proxy activity with shortcut_id.

### Issue 4: `buildIntentForUpdate` Missing Non-WhatsApp Message Support

**Severity: High**

The `buildIntentForUpdate()` method only handles WhatsApp message shortcuts. Other messaging apps (Telegram, Signal, Slack) are not handled:

**Current logic:**
```java
if ("message".equals(shortcutType) && "whatsapp".equals(messageApp)) {
    // Only handles WhatsApp
}
```

**Missing cases:**
- Telegram (`messageApp="telegram"`)
- Signal (`messageApp="signal"`)  
- Slack (`messageApp="slack"`)

**Impact:** Editing a Telegram/Signal/Slack shortcut results in `null` intent, breaking the proxy routing and losing tap tracking.

### Issue 5: JS `useShortcuts.updateShortcut` Doesn't Pass `slackTeamId`/`slackUserId`

**Severity: Low**

The `updateShortcut` function in `useShortcuts.ts` doesn't pass Slack-specific fields to `updatePinnedShortcut`:

```typescript
// Current code (line 322-338)
const result = await ShortcutPlugin.updatePinnedShortcut({
  id,
  label: shortcut.name,
  // ...
  phoneNumber: shortcut.phoneNumber,
  quickMessages: shortcut.quickMessages,
  messageApp: shortcut.messageApp,
  // Missing: slackTeamId, slackUserId
});
```

**Impact:** Slack shortcuts can't be properly updated because the team/user IDs aren't passed to the native layer for intent rebuilding.

## Recommended Fixes

### Fix 1: Add `shortcut_id` to All Proxies in `buildIntentForUpdate`

Add the shortcut ID extra to each proxy intent:

```java
// For WhatsAppProxyActivity
intent.putExtra(WhatsAppProxyActivity.EXTRA_SHORTCUT_ID, shortcutId);

// For ContactProxyActivity  
intent.putExtra(ContactProxyActivity.EXTRA_SHORTCUT_ID, shortcutId);

// For VideoProxyActivity
intent.putExtra("shortcut_id", shortcutId);
```

### Fix 2: Add Logic to Route WhatsApp Based on Message Count

Update the WhatsApp handling in `buildIntentForUpdate()` to check the number of messages:

```java
if ("message".equals(shortcutType) && "whatsapp".equals(messageApp)) {
    int messageCount = 0;
    if (quickMessagesJson != null) {
        try {
            JSONArray arr = new JSONArray(quickMessagesJson);
            messageCount = arr.length();
        } catch (Exception e) {}
    }
    
    if (messageCount >= 2) {
        // Multi-message: use WhatsAppProxyActivity
        intent = new Intent(context, WhatsAppProxyActivity.class);
        // ... existing code
    } else {
        // 0-1 message: use MessageProxyActivity
        intent = new Intent(context, MessageProxyActivity.class);
        intent.setAction("app.onetap.OPEN_MESSAGE");
        String url = buildWhatsAppUrl(phoneNumber, quickMessagesJson);
        intent.setData(Uri.parse(url));
        intent.putExtra(MessageProxyActivity.EXTRA_URL, url);
        intent.putExtra(MessageProxyActivity.EXTRA_SHORTCUT_ID, shortcutId);
    }
}
```

### Fix 3: Add Link Shortcut Support

Add a case for link shortcuts:

```java
else if ("link".equals(shortcutType) && contentUri != null) {
    intent = new Intent(context, LinkProxyActivity.class);
    intent.setAction("app.onetap.OPEN_LINK");
    intent.setData(Uri.parse(contentUri));
    intent.putExtra(LinkProxyActivity.EXTRA_URL, contentUri);
    intent.putExtra(LinkProxyActivity.EXTRA_SHORTCUT_ID, shortcutId);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
}
```

### Fix 4: Add Non-WhatsApp Message Shortcut Support

Add cases for Telegram, Signal, and Slack:

```java
else if ("message".equals(shortcutType) && messageApp != null) {
    String url = null;
    switch (messageApp) {
        case "telegram":
            url = "tg://resolve?phone=" + phoneNumber;
            break;
        case "signal":
            url = "sgnl://signal.me/#p/+" + phoneNumber;
            break;
        case "slack":
            if (slackTeamId != null && slackUserId != null) {
                url = "slack://user?team=" + slackTeamId + "&id=" + slackUserId;
            }
            break;
    }
    
    if (url != null) {
        intent = new Intent(context, MessageProxyActivity.class);
        intent.setAction("app.onetap.OPEN_MESSAGE");
        intent.setData(Uri.parse(url));
        intent.putExtra(MessageProxyActivity.EXTRA_URL, url);
        intent.putExtra(MessageProxyActivity.EXTRA_SHORTCUT_ID, shortcutId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }
}
```

### Fix 5: Pass Slack Details from JS Layer

Update `useShortcuts.ts` to include Slack fields:

```typescript
const result = await ShortcutPlugin.updatePinnedShortcut({
  // ... existing fields
  slackTeamId: shortcut.slackTeamId,
  slackUserId: shortcut.slackUserId,
});
```

And update the `ShortcutPlugin.ts` interface and native `updatePinnedShortcut` method to accept these parameters.

## Files to Modify

1. **`native/android/app/src/main/java/app/onetap/shortcuts/plugins/ShortcutPlugin.java`**
   - `buildIntentForUpdate()` method (lines 3177-3242)
   - `updatePinnedShortcut()` method to accept new parameters

2. **`src/plugins/ShortcutPlugin.ts`**
   - Add `slackTeamId` and `slackUserId` to `updatePinnedShortcut` options interface

3. **`src/hooks/useShortcuts.ts`**
   - Pass `slackTeamId` and `slackUserId` in `updateShortcut()` function

## Summary

The tap tracking infrastructure is solid, but the `buildIntentForUpdate()` method in `ShortcutPlugin.java` has several gaps that cause tracking to fail for edited shortcuts. The main issues are:

1. Missing `shortcut_id` extras in rebuilt intents
2. Incorrect routing logic for WhatsApp based on message count
3. Missing handlers for link shortcuts
4. Missing handlers for non-WhatsApp message shortcuts (Telegram, Signal, Slack)
5. Missing Slack-specific parameters in the JS-to-native bridge

