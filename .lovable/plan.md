
# Contact Photo Logic - COMPLETE ✅

## Summary

Contact photos (or initials fallback) now appear in BOTH:
1. **Home screen shortcuts** - via `iconData` (photo) or `iconText` (initials)
2. **Scheduled reminders** - via `ContactAvatar` component

## Flow for Home Screen Shortcuts

```
ContactShortcutCustomizer
  → pickContact() returns { name, phoneNumber, photoBase64 }
    → If photoBase64: icon = { type: 'thumbnail', value: photoBase64 }
    → Else if name: icon = { type: 'text', value: getInitials(name) }
    → Else: icon = { type: 'emoji', value: '📞' or '💬' }
      
shortcutManager.ts
  → If icon.type === 'thumbnail' && value.startsWith('data:')
    → Extract base64 and pass as iconData to native
  → If icon.type === 'text'
    → Pass as iconText to native → createTextIcon()
  → If icon.type === 'emoji'
    → Pass as iconEmoji to native → createEmojiIcon()

Native ShortcutPlugin.java
  → createIcon() priority: iconData > iconUri > iconEmoji > iconText
  → createTextIcon() renders initials on colored background
```

## Flow for Scheduled Reminders

```
ScheduledActionCreator / ScheduledActionEditor
  → pickContact() returns { name, phoneNumber, photoBase64 }
    → Store in destination: { type: 'contact', contactName, phoneNumber, photoUri: photoBase64 }
      
ContactAvatar component
  → If photoUri: display photo
  → Else if name: display initials with colored background
  → Else: display fallback Phone icon
```

## Key Changes Made

### 1. Native Android (`ShortcutPlugin.java`) - Already fixed
- Uses `openContactPhotoInputStream()` API
- Returns `photoBase64` as `data:image/jpeg;base64,...`

### 2. `ContactShortcutCustomizer.tsx`
- Now uses `getInitials()` from ContactAvatar
- When no photo: sets `icon = { type: 'text', value: initials }`
- Home screen shortcut will show initials on colored background

### 3. `ContactAvatar.tsx`
- Exported `getInitials()` function for reuse
- Displays photo > initials > fallback icon

### 4. `shortcutManager.ts` - Already working
- Handles `icon.type === 'text'` by passing `iconText` to native
- Native `createTextIcon()` renders initials on adaptive icon canvas

## Testing Checklist

### Home Screen Shortcuts
- [ ] Pick contact WITH photo → shortcut icon shows photo
- [ ] Pick contact WITHOUT photo → shortcut icon shows initials (e.g., "JD")
- [ ] Pick contact without name → shortcut icon shows 📞 or 💬

### Scheduled Reminders  
- [ ] Create reminder with contact photo → avatar shows photo
- [ ] Create reminder without photo → avatar shows initials
- [ ] Reminder list, action sheet, editor all show correct avatar

**Run `npx cap sync` after pulling changes.**
