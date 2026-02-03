
# Add Missing English Translations

## Overview
This plan addresses all missing English translations in the i18n configuration. After completing these additions to the English locale file (`src/i18n/locales/en.json`), the app will have all user-facing strings properly defined, enabling translation to other languages.

## Missing Translation Keys by Category

### 1. Usage Insights (`usage` namespace) - NEW SECTION
The `UsageInsights.tsx` component uses translation keys that don't exist in the English locale file.

**Keys to add:**
```json
"usage": {
  "title": "Usage Insights",
  "shortcuts": "Shortcuts",
  "totalTaps": "Total Taps",
  "weeklyActivity": "This Week",
  "noShortcuts": "Create your first shortcut to see insights!",
  "startUsing": "Start using your shortcuts to see your stats!",
  "gettingStarted": "You're getting started! Keep it up!",
  "doingGreat": "You're doing great! {{taps}} taps saved this month.",
  "powerUser": "Power user! You've saved {{taps}} taps this month! 🔥",
  "superUser": "🏆 Super user! {{taps}} taps saved this month!"
}
```

### 2. Auth States (`auth` namespace) - NEW SECTION
Authentication-related screens need translations.

**Keys to add:**
```json
"auth": {
  "signingIn": "Signing you in...",
  "pleaseWait": "Please wait while we complete authentication.",
  "signedInSuccess": "Signed in successfully!",
  "redirecting": "Redirecting you now...",
  "signInFailed": "Sign in failed",
  "tokenExpired": "Your session token is invalid or expired.",
  "tryTheseSteps": "Try these steps:",
  "step1": "Clear your session and try signing in again",
  "step2": "Try using a different browser or incognito mode",
  "step3": "Clear your browser cookies for this site",
  "clearSessionRetry": "Clear Session & Retry",
  "goToHome": "Go to Home",
  "contactSupport": "Contact Support",
  "technicalDetails": "Technical details",
  "checkingStatus": "Checking sign-in status...",
  "completingSignIn": "Completing sign-in...",
  "signInInterrupted": "Sign-in was interrupted. Would you like to try again?"
}
```

### 3. Not Found Page (`notFound` namespace) - NEW SECTION
**Keys to add:**
```json
"notFound": {
  "title": "404",
  "message": "Oops! Page not found",
  "returnHome": "Return to Home"
}
```

### 4. Video Player (`videoPlayer` namespace) - NEW SECTION
**Keys to add:**
```json
"videoPlayer": {
  "loading": "Loading video...",
  "cannotPlay": "Cannot Play Video",
  "unknownError": "An unknown error occurred",
  "retry": "Retry",
  "openWith": "Open with...",
  "back": "Back",
  "showDetails": "Show details",
  "hideDetails": "Hide details",
  "noUri": "No video URI provided",
  "fileNotFound": "Could not locate video file",
  "fileNotAccessible": "Video file not accessible",
  "fileEmpty": "Video file is empty",
  "formatNotSupported": "This video format is not supported by your device",
  "networkError": "Network error while loading video",
  "fileCorrupted": "Video file appears to be corrupted",
  "unableToPlay": "Unable to play this video"
}
```

### 5. Cloud Backup (`cloudBackup` namespace) - NEW SECTION
**Keys to add:**
```json
"cloudBackup": {
  "title": "Cloud Backup",
  "signInWithGoogle": "Sign in with Google",
  "syncDescription": "Sync bookmarks across devices",
  "syncNow": "Sync Now",
  "syncMergeDesc": "Merge local & cloud data safely",
  "recoveryTools": "Recovery tools",
  "recoveryHint": "Use only if sync behaves unexpectedly",
  "forceUpload": "Force upload local → cloud",
  "forceDownload": "Force download cloud → local",
  "signOut": "Sign Out",
  "loading": "Loading...",
  "signInFailed": "Sign in failed",
  "sessionExpired": "Session expired. Please try signing in again.",
  "couldNotSignIn": "Could not sign in with Google. Please try again.",
  "signedOut": "Signed out",
  "signedOutDesc": "You have been signed out successfully.",
  "signOutFailed": "Sign out failed",
  "couldNotSignOut": "Could not sign out. Please try again.",
  "syncBlocked": "Sync blocked",
  "syncComplete": "Sync complete",
  "syncCompleteChanges": "Added {{downloaded}} from cloud, backed up {{uploaded}} to cloud.",
  "alreadyInSync": "Everything is already in sync.",
  "syncFailed": "Sync failed",
  "couldNotSync": "Could not sync bookmarks. Try again.",
  "uploadBlocked": "Upload blocked",
  "uploadComplete": "Upload complete",
  "uploadCompleteDesc": "Uploaded {{count}} items to cloud.",
  "uploadFailed": "Upload failed",
  "couldNotUpload": "Could not upload.",
  "downloadBlocked": "Download blocked",
  "downloadComplete": "Download complete",
  "downloadCompleteDesc": "Downloaded {{count}} new items.",
  "noNewItems": "No new items to download.",
  "downloadFailed": "Download failed",
  "couldNotDownload": "Could not download."
}
```

### 6. Slideshow Additional Keys (add to existing `slideshow` namespace)
**Keys to add:**
```json
"slideshow": {
  ... (existing keys),
  "playing": "Playing",
  "paused": "Paused"
}
```

### 7. Scheduled Actions Additional Keys (add to existing `scheduledActions` namespace)
**Keys to add:**
```json
"scheduledActions": {
  ... (existing keys),
  "enterUrl": "Enter URL",
  "typeOrPasteLink": "Type or paste a link",
  "savedBookmarkLabel": "Saved Bookmark",
  "chooseFromLibrary": "Choose from your library",
  "whatToOpen": "What to open",
  "selectDescription": "Select what should open when this action triggers.",
  "localFile": "Local File",
  "localFileDesc": "Photo, video, PDF, or document",
  "linkLabel": "Link",
  "linkDesc": "Website or saved bookmark",
  "contactLabel": "Contact",
  "contactDesc": "Call someone at a scheduled time",
  "nameThisAction": "Name this action",
  "scheduling": "Scheduling...",
  "scheduleAction": "Schedule Action",
  "continue": "Continue"
}
```

---

## Implementation Steps

### Step 1: Update `src/i18n/locales/en.json`
Add all the new translation namespaces and keys listed above to the English locale file.

### Step 2: Update Components to Use Translations

#### 2.1 `src/components/UsageInsights.tsx`
- Remove inline fallback strings since keys will exist
- Change `t('usage.title', 'Usage Insights')` to `t('usage.title')`
- Apply to all translation calls in this file

#### 2.2 `src/components/auth/AuthLoadingState.tsx`
- Add `import { useTranslation } from 'react-i18next';`
- Add `const { t } = useTranslation();`
- Replace hardcoded strings with translation keys

#### 2.3 `src/components/auth/AuthSuccessState.tsx`
- Add `import { useTranslation } from 'react-i18next';`
- Add `const { t } = useTranslation();`
- Replace hardcoded strings with translation keys

#### 2.4 `src/components/auth/AuthErrorState.tsx`
- Add `import { useTranslation } from 'react-i18next';`
- Add `const { t } = useTranslation();`
- Replace hardcoded strings with translation keys

#### 2.5 `src/components/auth/OAuthRecoveryBanner.tsx`
- Add `import { useTranslation } from 'react-i18next';`
- Add `const { t } = useTranslation();`
- Replace hardcoded strings with translation keys

#### 2.6 `src/pages/NotFound.tsx`
- Add `import { useTranslation } from 'react-i18next';`
- Add `const { t } = useTranslation();`
- Replace hardcoded strings with translation keys

#### 2.7 `src/pages/VideoPlayer.tsx`
- Add `import { useTranslation } from 'react-i18next';`
- Add `const { t } = useTranslation();`
- Replace all hardcoded error messages and UI strings

#### 2.8 `src/components/CloudBackupSection.tsx`
- Add `import { useTranslation } from 'react-i18next';`
- Add `const { t } = useTranslation();`
- Replace all hardcoded strings

#### 2.9 `src/components/ScheduledActionCreator.tsx`
- Replace remaining hardcoded strings with translation keys
- Strings like "Enter URL", "Continue", "Schedule Action", etc.

#### 2.10 `src/pages/SlideshowViewer.tsx`
- Remove inline fallbacks now that keys will exist

---

## Files to be Modified

| File | Change Type |
|------|-------------|
| `src/i18n/locales/en.json` | Add 6 new namespaces + extend 2 existing |
| `src/components/UsageInsights.tsx` | Remove fallback strings |
| `src/components/auth/AuthLoadingState.tsx` | Add i18n support |
| `src/components/auth/AuthSuccessState.tsx` | Add i18n support |
| `src/components/auth/AuthErrorState.tsx` | Add i18n support |
| `src/components/auth/OAuthRecoveryBanner.tsx` | Add i18n support |
| `src/pages/NotFound.tsx` | Add i18n support |
| `src/pages/VideoPlayer.tsx` | Add i18n support |
| `src/pages/SlideshowViewer.tsx` | Remove fallback strings |
| `src/components/CloudBackupSection.tsx` | Add i18n support |
| `src/components/ScheduledActionCreator.tsx` | Complete i18n coverage |

---

## Summary of New Translation Keys

| Namespace | Key Count | Status |
|-----------|-----------|--------|
| `usage` | 10 keys | New |
| `auth` | 17 keys | New |
| `notFound` | 3 keys | New |
| `videoPlayer` | 17 keys | New |
| `cloudBackup` | 30 keys | New |
| `slideshow` | 2 keys | Extend existing |
| `scheduledActions` | 14 keys | Extend existing |

**Total: ~93 new translation keys**

---

## Outcome
After implementation:
- All user-facing strings will be properly defined in `en.json`
- The app will be ready for translation to other languages
- Fallback strings in components will no longer be needed
- i18n coverage will be complete across the application
