

# Pass Original Filename to External Apps

## Overview

When users open files in external apps (via "Open with" options), the external apps often display cryptic URIs or generic names like "Document" instead of the user's meaningful shortcut label. This impacts the premium UX experience. We need to pass the original filename/title to external apps for proper display.

---

## Identified Locations

There are **7 locations** across 5 files where files are opened in external/installed apps:

| # | File | Method | File Type | Has Title? |
|---|------|--------|-----------|------------|
| 1 | `NativePdfViewerActivity.java` | `openWithExternalApp()` | PDF | ❌ No |
| 2 | `NativeVideoPlayerActivity.java` | `tryOpenExternalPlayer()` | Video | ❌ No |
| 3 | `NativeVideoPlayerActivity.java` | `openInExternalPlayer()` | Video | ❌ No |
| 4 | `FileProxyActivity.java` | `openFileInExternalApp()` | Audio/Docs | ❌ No (has title in intent but doesn't pass) |
| 5 | `ShortcutPlugin.java` | `openWithExternalApp()` | Any file | ❌ No |
| 6 | `NotificationHelper.java` | `buildActionIntent()` (file case) | Files from reminders | ❌ No |
| 7 | `NotificationClickActivity.java` | `executeAction()` (file case) | Files from reminders | ❌ No |

---

## How External Apps Get Filenames

Android external apps typically get the displayed filename from one of these sources:

1. **ClipData label** (most reliable): When setting `ClipData.newUri(resolver, label, uri)`, the `label` parameter is often used by receiving apps as the display name
2. **ContentProvider query** (fallback): Apps query `OpenableColumns.DISPLAY_NAME` from the content resolver
3. **Uri path segment** (last resort): The last path segment of the URI

Since we're using FileProvider URIs, external apps that query `DISPLAY_NAME` get the internal filename, not our friendly label. The **ClipData label** is our best option for passing a display name.

---

## Implementation Plan

### 1. NativePdfViewerActivity - PDF Viewer "Open with"

**Current code (lines 1188-1206):**
```java
private void openWithExternalApp() {
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setDataAndType(pdfUri, "application/pdf");
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    Intent chooser = Intent.createChooser(intent, null);
    startActivity(chooser);
}
```

**Required changes:**
- Add `pdfTitle` field to store the document title
- Pass title via `PDFProxyActivity` → `NativePdfViewerActivity`
- Set `ClipData` with meaningful label

```java
// Add field
private String pdfTitle;

// In openWithExternalApp():
private void openWithExternalApp() {
    if (pdfUri == null) return;
    
    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setDataAndType(pdfUri, "application/pdf");
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    
    // Set ClipData with meaningful display name
    String displayName = (pdfTitle != null && !pdfTitle.isEmpty()) ? pdfTitle : "Document";
    ClipData clipData = ClipData.newUri(getContentResolver(), displayName, pdfUri);
    intent.setClipData(clipData);
    
    Intent chooser = Intent.createChooser(intent, null);
    startActivity(chooser);
}
```

### 2. PDFProxyActivity - Pass Title Through

**Required changes:**
- Accept `shortcut_title` extra from shortcut intents
- Forward it to `NativePdfViewerActivity`

```java
// In openInternalViewer():
String shortcutTitle = incomingIntent.getStringExtra("shortcut_title");

viewerIntent.putExtra("shortcut_title", shortcutTitle);
```

### 3. ShortcutPlugin - Pass Title When Creating PDF Shortcuts

**Lines 304-312 - PDF shortcut creation:**
```java
// Add shortcut_title for PDF shortcuts
intent.putExtra("shortcut_title", finalLabel);
```

**Lines 4282-4291 - PDF shortcut update:**
```java
// Add shortcut_title for PDF shortcut updates
intent.putExtra("shortcut_title", label);
```

### 4. NativeVideoPlayerActivity - Video "Open with"

**Two methods need updates:**

```java
// In tryOpenExternalPlayer() and openInExternalPlayer():
// Use videoTitle which is already available

String displayName = (videoTitle != null && !videoTitle.isEmpty()) ? videoTitle : "Video";
ClipData clipData = ClipData.newUri(getContentResolver(), displayName, videoUri);
externalIntent.setClipData(clipData);
```

### 5. FileProxyActivity - Generic File Handler

**Current situation:** Has `shortcutTitle` from intent but doesn't use it for external opening.

```java
// In openFileInExternalApp():
private void openFileInExternalApp(Uri fileUri, String mimeType, String displayName) {
    Intent viewIntent = new Intent(Intent.ACTION_VIEW);
    viewIntent.setDataAndType(fileUri, mimeType);
    viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    
    // Pass display name via ClipData
    String label = (displayName != null && !displayName.isEmpty()) ? displayName : "File";
    ClipData clipData = ClipData.newUri(getContentResolver(), label, fileUri);
    viewIntent.setClipData(clipData);
    
    // ... rest of method
}
```

### 6. ShortcutPlugin.openWithExternalApp() - JS Bridge

**Lines 900-990:**
```java
// Accept optional displayName parameter
String displayName = call.getString("displayName", null);

// When setting ClipData:
String label = (displayName != null && !displayName.isEmpty()) ? displayName : "File";
ClipData clipData = ClipData.newUri(context.getContentResolver(), label, uri);
intent.setClipData(clipData);
```

### 7. NotificationHelper.buildActionIntent() and NotificationClickActivity.executeAction()

**For file type reminders:**

The notification system needs to pass the shortcut label through the notification intent and use it when opening files.

**NotificationHelper (lines 138-148):**
```java
case "file":
    org.json.JSONObject fileData = new org.json.JSONObject(destinationData);
    String fileUri = fileData.getString("uri");
    String mimeType = fileData.optString("mimeType", "*/*");
    String displayName = fileData.optString("displayName", "File");
    
    Intent fileIntent = new Intent(Intent.ACTION_VIEW);
    fileIntent.setDataAndType(Uri.parse(fileUri), mimeType);
    fileIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    
    // Pass display name via ClipData
    ClipData clipData = ClipData.newUri(context.getContentResolver(), displayName, Uri.parse(fileUri));
    fileIntent.setClipData(clipData);
    return fileIntent;
```

**NotificationClickActivity (lines 202-208):**
Same pattern as above.

---

## Files to Modify

| File | Changes |
|------|---------|
| `NativePdfViewerActivity.java` | Add `pdfTitle` field, read from intent, use in `openWithExternalApp()` |
| `PDFProxyActivity.java` | Read `shortcut_title`, forward to viewer |
| `NativeVideoPlayerActivity.java` | Use existing `videoTitle` in ClipData for both external player methods |
| `FileProxyActivity.java` | Pass `shortcutTitle` to `openFileInExternalApp()` |
| `ShortcutPlugin.java` | Add `shortcut_title` to PDF intents (2 places), accept `displayName` in `openWithExternalApp()` |
| `NotificationHelper.java` | Use `displayName` from JSON in ClipData |
| `NotificationClickActivity.java` | Use `displayName` from JSON in ClipData |

---

## Technical Notes

### ClipData Label Behavior

Not all external apps respect the ClipData label - some will still query the ContentProvider for `DISPLAY_NAME`. However, many popular apps (file viewers, PDF readers, media players) do use the ClipData label when available, so this provides a meaningful improvement.

### Backward Compatibility

- Existing shortcuts without `shortcut_title` will fall back to generic names ("Document", "Video", "File")
- No breaking changes to existing functionality

---

## Testing Checklist

- [ ] PDF "Open with" shows shortcut label in external PDF reader
- [ ] Video "Open with" shows shortcut label in external video player
- [ ] Audio file taps show shortcut label in external music player
- [ ] Document shortcuts show shortcut label when opening externally
- [ ] Reminder notifications for files show correct label when opened
- [ ] External opens from clipboard/share still work correctly
- [ ] Fallback to generic names works when no title is available

