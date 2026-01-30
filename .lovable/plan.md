
# Remove Telegram, Signal, and Slack Support

## Summary

Remove all code related to Telegram, Signal, and Slack messaging shortcuts since the app specializes in WhatsApp. This cleanup simplifies the codebase and focuses on the core functionality.

## Code to Remove/Modify

### 1. TypeScript Types

**File: `src/types/shortcut.ts`**

| Change | Before | After |
|--------|--------|-------|
| `MessageApp` type | `'whatsapp' \| 'telegram' \| 'signal' \| 'slack'` | `'whatsapp'` |
| `slackUserId` field | Present | **Remove** |
| `slackTeamId` field | Present | **Remove** |
| Comment update | "For dial and WhatsApp/Telegram/Signal" | "For dial and WhatsApp" |

### 2. Platform Icons

**File: `src/lib/platformIcons.ts`**

| Change | Lines | Description |
|--------|-------|-------------|
| Remove `telegram` from icon type | Line 8 | Remove from union type |
| Remove `slack` from icon type | Line 8 | Remove from union type |
| Remove Telegram pattern | Lines 70-72 | Remove platform detection |
| Remove Slack pattern | Lines 97-100 | Remove platform detection |

### 3. Shortcut Manager

**File: `src/lib/shortcutManager.ts`**

| Change | Lines | Description |
|--------|-------|-------------|
| Remove Telegram case | Lines 62-68 | Remove switch case |
| Remove Signal case | Lines 70-76 | Remove switch case |
| Remove Slack case | Lines 78-86 | Remove switch case |

### 4. Hooks

**File: `src/hooks/useShortcuts.ts`**

| Change | Lines | Description |
|--------|-------|-------------|
| Remove `slackDetails` parameter | Line 225 | Remove from `createMessageShortcut` |
| Remove `slackTeamId`/`slackUserId` assignments | Lines 238-239 | Remove fields |
| Remove from `updateShortcut` updates type | Line 313 | Remove Slack fields |
| Remove from update call | Lines 345-346 | Remove Slack data passing |

### 5. Access Flow Component

**File: `src/components/AccessFlow.tsx`**

| Change | Lines | Description |
|--------|-------|-------------|
| Remove `slackTeamId`/`slackUserId` from handler params | Lines 276-277 | Remove fields |
| Remove Slack details passing | Lines 302-304 | Remove conditional |

### 6. Plugin Interfaces

**File: `src/plugins/ShortcutPlugin.ts`**

| Change | Lines | Description |
|--------|-------|-------------|
| Update `messageApp` comment | Line 273 | Change to just `'whatsapp'` |
| Remove `slackTeamId` property | Line 279 | Remove |
| Remove `slackUserId` property | Line 280 | Remove |

**File: `src/plugins/shortcutPluginWeb.ts`**

| Change | Lines | Description |
|--------|-------|-------------|
| Remove `messageApp` optional param | Line 469 | Remove (or keep for WhatsApp only) |
| Clean up unused properties | ~Lines 465-475 | Simplify interface |

### 7. Native Android Code

**File: `native/android/app/src/main/java/app/onetap/shortcuts/plugins/ShortcutPlugin.java`**

| Change | Lines | Description |
|--------|-------|-------------|
| Update comment | Line 346 | Remove Telegram/Signal/Slack mentions |
| Remove Telegram icon path | Lines 1714-1716+ | Remove from `getPlatformPath()` |
| Remove Telegram color | Line 1960 | Remove from `getPlatformColor()` |
| Remove Slack color | Line 1967 | Remove from `getPlatformColor()` |
| Remove Telegram fallback | Line 1999 | Remove from `getPlatformFallback()` |
| Remove Slack fallback | Line 2006 | Remove from `getPlatformFallback()` |
| Remove `slackTeamId`/`slackUserId` handling | Lines 3706-3708 | Remove variables |
| Remove from `buildIntentForUpdate` signature | Lines 3821-3822 | Remove params |
| Remove Telegram/Signal/Slack cases | Lines 3892-3906 | Remove switch cases |

**File: `native/android/app/src/main/java/app/onetap/shortcuts/MessageProxyActivity.java`**

| Change | Lines | Description |
|--------|-------|-------------|
| Update JavaDoc | Lines 10-13 | Remove Telegram/Signal/Slack mentions |

### 8. Action Sheet Labels

**File: `src/components/ShortcutActionSheet.tsx`**

| Change | Lines | Description |
|--------|-------|-------------|
| Remove generic "Message" label fallback | Lines 112 | Since only WhatsApp is supported |

### 9. Translation Keys (optional cleanup)

**File: `src/i18n/locales/en.json`**

| Change | Description |
|--------|-------------|
| `typeMessage` key | Could remove if no longer needed (only WhatsApp remains) |

## Files Summary

| File | Action |
|------|--------|
| `src/types/shortcut.ts` | Simplify `MessageApp` type, remove Slack fields |
| `src/lib/platformIcons.ts` | Remove Telegram/Slack from platform detection |
| `src/lib/shortcutManager.ts` | Remove Telegram/Signal/Slack cases |
| `src/hooks/useShortcuts.ts` | Remove Slack-related parameters and fields |
| `src/components/AccessFlow.tsx` | Remove Slack handling |
| `src/plugins/ShortcutPlugin.ts` | Remove Slack properties |
| `src/plugins/shortcutPluginWeb.ts` | Simplify interface |
| `native/.../ShortcutPlugin.java` | Remove messaging platform code |
| `native/.../MessageProxyActivity.java` | Update documentation |
| `src/components/ShortcutActionSheet.tsx` | Simplify type label logic |

## What Stays

- **WhatsApp shortcuts**: Full support with quick messages
- **Contact dial shortcuts**: Direct call functionality  
- **Platform icons for Telegram/Slack URLs**: Keep these in `platformIcons.ts` since users may still bookmark Telegram/Slack **websites** - this is different from messaging integration
- **MessageProxyActivity**: Still needed for WhatsApp 0-1 message shortcuts

## Impact

- **Reduced code complexity**: ~100 lines removed
- **Cleaner type definitions**: No unused optional fields
- **Focused product**: Clear WhatsApp specialization
- **No user-facing changes**: These features were never exposed in the UI

## Notes

The platform icon detection for Telegram and Slack **websites** (telegram.org, slack.com) will be preserved in `platformIcons.ts` since users may still create URL shortcuts to these sites. The removal only affects the **messaging integration** code paths.
