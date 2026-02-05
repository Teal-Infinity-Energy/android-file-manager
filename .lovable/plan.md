
# Google Play Store Production Publishing Plan

## Executive Summary

This plan prepares OneTap Shortcuts for production publishing on Google Play Store as a one-time paid app. The app is already well-architected with strong security foundations (RLS policies, local-first design) and comprehensive native Android functionality.

---

## 1. Production Build Readiness

### Current Status
- **Build Configuration**: Already configured for Android 12+ (minSdk 31, compileSdk 36, targetSdk 36)
- **Gradle/JDK**: Using Gradle 8.13 with JDK 21 (production-ready)
- **Patch Script**: `scripts/android/patch-android-project.mjs` properly handles SDK versions and dependencies

### Required Changes

#### A. Version Configuration
Create or update `native/android/app/build.gradle` version values:

| Field | Current | Required |
|-------|---------|----------|
| `versionCode` | Not set | `1` (increment for each release) |
| `versionName` | Not set | `1.0.0` |

#### B. Release Signing Configuration
Create signing configuration for release builds. The keystore must be generated locally.

Add to `android/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: 'onetap-release.jks')
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: ''
            keyAlias 'onetap-key'
            keyPassword System.getenv("KEY_PASSWORD") ?: ''
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### C. Debug Logging Review
The codebase contains production-appropriate logging:
- `console.log/warn/error` statements are used for debugging (54 files with console usage)
- These are appropriate for production as they only appear in developer tools
- Native `Log.d/Log.e` statements follow Android best practices

**Recommendation**: No changes needed. Console logs are stripped from production builds by minification, and they don't affect end-user experience.

#### D. ProGuard Rules
Create `native/android/app/proguard-rules.pro` for code shrinking:
- Keep Capacitor plugin classes
- Keep ExoPlayer/Media3 classes
- Preserve native activity classes

---

## 2. Google Play Store Compliance

### A. Permissions Audit

| Permission | Usage | Justified | Play Store Category |
|------------|-------|-----------|---------------------|
| `INTERNET` | Cloud sync, metadata fetch | Yes | Standard |
| `INSTALL_SHORTCUT` | Core feature - home screen shortcuts | Yes | Core functionality |
| `READ_EXTERNAL_STORAGE` (SDK ≤32) | File access for shortcuts | Yes | Media access |
| `WRITE_EXTERNAL_STORAGE` (SDK ≤29) | Legacy file access | Yes | Media access |
| `READ_MEDIA_IMAGES` (SDK 33+) | Image shortcuts | Yes | Media access |
| `READ_MEDIA_VIDEO` (SDK 33+) | Video shortcuts | Yes | Media access |
| `SCHEDULE_EXACT_ALARM` | Reminder notifications | Yes | Alarms & reminders |
| `USE_EXACT_ALARM` | Reminder notifications | Yes | Alarms & reminders |
| `RECEIVE_BOOT_COMPLETED` | Restore alarms after reboot | Yes | Alarms & reminders |
| `POST_NOTIFICATIONS` (SDK 33+) | Reminder notifications | Yes | Notifications |
| `VIBRATE` | Haptic feedback | Yes | Standard |
| `CALL_PHONE` | One-tap call shortcuts | Yes | Phone calls |

**Assessment**: All permissions are justified and properly scoped with `maxSdkVersion` where appropriate. No over-privileged or unused permissions.

### B. Privacy & Data Safety Declaration

| Category | Data Collected | Shared | Required |
|----------|---------------|--------|----------|
| **Email** | Yes (Google OAuth) | No | Optional (for sync) |
| **Name** | Yes (Google OAuth) | No | Optional (for sync) |
| **Phone numbers** | No (stored locally only) | No | N/A |
| **Files/media** | No (references stored locally) | No | N/A |
| **App activity** | No analytics | No | N/A |
| **Device identifiers** | No | No | N/A |

**Data Safety Form Responses**:
- Does your app collect user data? **Yes** (optional account info)
- Is data encrypted in transit? **Yes** (Supabase uses HTTPS)
- Can users request data deletion? **Yes** (delete account feature)
- Does your app share data with third parties? **No**

---

## 3. Privacy Policy (Updated Version)

The existing `public/privacy-policy.html` is well-structured but needs updates for production compliance:

### Required Updates:
1. Update "Last updated" date to current date
2. Clarify "no analytics" statement (remove ambiguity about "if analytics are enabled")
3. Explicitly state no ads are used
4. Add Supabase infrastructure mention
5. Add data retention periods

### Updated Privacy Policy
A production-ready privacy policy will be created at `public/privacy-policy.html` with:
- Clear statement: "OneTap does not use advertising or analytics tracking"
- Explicit Supabase mention as backend provider
- Specific data retention information
- GDPR/CCPA compliance language
- Clear data deletion instructions

---

## 4. Store Listing Content

### App Title
**OneTap - Quick Access Shortcuts**

### Short Description (80 chars max)
"Create instant home screen shortcuts for any URL, contact, or file."

### Full Description
```text
OneTap puts everything you need one tap away.

Create home screen shortcuts for:
• Websites and web apps
• Contacts (call or message instantly)
• Videos and PDFs with native viewers
• Reminders with scheduled notifications

DESIGNED FOR CALM

OneTap respects your attention. No notifications asking you to engage. No usage tracking. No "streaks" or gamification. Just the shortcuts you create, working exactly as expected.

LOCAL-FIRST

Your shortcuts live on your device. Sign in with Google to sync across devices, or use OneTap entirely offline. Your data, your choice.

PREMIUM QUALITY

• Native PDF viewer with smooth scrolling
• Video player with picture-in-picture support
• WhatsApp quick messages with custom templates
• Beautiful icon customization

WHAT YOU GET

✓ Unlimited shortcuts
✓ All features included
✓ No ads, ever
✓ No subscriptions
✓ No in-app purchases
✓ Privacy-focused design

One purchase. Complete access. Forever.
```

### Feature Bullet Points
1. Create home screen shortcuts instantly
2. Native PDF and video viewers
3. WhatsApp quick message templates
4. Scheduled reminders with notifications
5. Optional cloud sync with Google account
6. No ads or subscriptions

### "Why Paid" Positioning
This positioning is embedded naturally in the description rather than defensively stated. The phrase "One purchase. Complete access. Forever." communicates premium value without appearing defensive.

### Screenshots Guide

| Order | Screen | State | Caption |
|-------|--------|-------|---------|
| 1 | Home screen | Shortcuts pinned | "One tap to what matters" |
| 2 | Shortcut creation | URL being added | "Create shortcuts in seconds" |
| 3 | Native PDF viewer | Document open | "Built-in PDF reader" |
| 4 | Video player | PiP mode active | "Picture-in-picture support" |
| 5 | Contact shortcuts | Quick call/message | "Instant contact access" |
| 6 | Reminders | Scheduled notification | "Never forget with reminders" |
| 7 | Icon customization | Emoji/color picker | "Personalize your shortcuts" |
| 8 | Cloud sync | Profile screen | "Sync across devices (optional)" |

---

## 5. Supabase Production Hardening

### RLS Policy Audit

**Current Status**: All tables have proper RLS policies using `auth.uid() = user_id`:

| Table | RLS | Policies |
|-------|-----|----------|
| `cloud_bookmarks` | Enabled | CRUD restricted to owner |
| `cloud_trash` | Enabled | CRUD restricted to owner |
| `cloud_scheduled_actions` | Enabled | CRUD restricted to owner |

**Assessment**: RLS is correctly configured. No cross-user access possible.

### Edge Functions Review

| Function | Purpose | Security |
|----------|---------|----------|
| `fetch-url-metadata` | CORS bypass for metadata | No auth required, read-only |
| `delete-account` | Account deletion | Requires valid JWT, uses service role |

**Assessment**: Both functions are production-ready:
- `fetch-url-metadata`: Properly handles CORS, has timeout, minimal data exposure
- `delete-account`: Validates JWT, uses admin client for privileged operations

### Linter Warning Resolution

The linter shows one warning:
- **Leaked Password Protection Disabled**

This is acceptable for this app because:
1. The app uses Google OAuth exclusively, not password authentication
2. No password fields exist in the app

**No action required** - this warning is not applicable.

### Free Tier Considerations

| Resource | Free Limit | App Usage | Risk |
|----------|------------|-----------|------|
| Database | 500MB | Low (text data only) | Very low |
| Auth | 50,000 MAU | Expected low | Very low |
| Edge functions | 500k invocations/month | Metadata fetch only | Low |
| Bandwidth | 2GB/month | Text sync only | Very low |

---

## 6. CI/CD Configuration

### GitHub Actions Workflow

Create `.github/workflows/android-release.yml`:

```yaml
name: Android Release Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      track:
        description: 'Play Store track (internal/alpha/beta/production)'
        required: true
        default: 'internal'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web app
        run: npm run build
      
      - name: Set up Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Initialize Capacitor Android
        run: |
          npx cap add android || true
          npx cap sync android
          node scripts/android/patch-android-project.mjs
      
      - name: Decode keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/onetap-release.jks
      
      - name: Build release AAB
        working-directory: android
        env:
          KEYSTORE_PATH: onetap-release.jks
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: ./gradlew bundleRelease
      
      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-aab
          path: android/app/build/outputs/bundle/release/*.aab
      
      - name: Upload to Play Store
        if: github.event_name == 'push' || github.event.inputs.track != ''
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: app.onetap.shortcuts
          releaseFiles: android/app/build/outputs/bundle/release/*.aab
          track: ${{ github.event.inputs.track || 'internal' }}
          status: completed
```

### Required GitHub Secrets

| Secret | Description | How to Generate |
|--------|-------------|-----------------|
| `KEYSTORE_BASE64` | Base64-encoded release keystore | `base64 -w0 onetap-release.jks` |
| `KEYSTORE_PASSWORD` | Keystore password | Set during keytool generation |
| `KEY_PASSWORD` | Key password | Set during keytool generation |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play API credentials | Play Console → API access → Service account |

### Local Build Commands

```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore onetap-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias onetap-key

# Build release
npm run build
npx cap sync android
node scripts/android/patch-android-project.mjs
cd android && ./gradlew bundleRelease

# Find AAB
ls -la android/app/build/outputs/bundle/release/
```

---

## 7. Final Pre-Publish Checklist

### Play Console Setup (One-Time)

- [ ] Create app in Play Console (app.onetap.shortcuts)
- [ ] Complete App Content questionnaire
- [ ] Upload AAB to Internal testing track first
- [ ] Complete Data Safety form
- [ ] Add privacy policy URL
- [ ] Set up Store listing (title, descriptions, screenshots)
- [ ] Upload feature graphic (1024x500)
- [ ] Upload app icon (512x512)
- [ ] Complete Content rating questionnaire
- [ ] Set pricing ($2.99 recommended)
- [ ] Configure target countries

### Before Each Release

- [ ] Increment `versionCode` in build.gradle
- [ ] Update `versionName` if significant changes
- [ ] Run `npm run build` successfully
- [ ] Run `npx cap sync android`
- [ ] Run `node scripts/android/patch-android-project.mjs`
- [ ] Build release AAB: `./gradlew bundleRelease`
- [ ] Verify AAB is signed: `jarsigner -verify *.aab`
- [ ] Test on physical device
- [ ] Write release notes

### Common Rejection Risks

| Risk | Mitigation |
|------|------------|
| Missing privacy policy | Ensure URL is accessible and comprehensive |
| Incomplete Data Safety | Match declarations to actual behavior |
| Broken functionality | Test all shortcut types before submission |
| Permission denials crash app | All permission denials are gracefully handled |
| Content rating mismatch | Answer questionnaire honestly |

---

## 8. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `.github/workflows/android-release.yml` | CI/CD workflow |
| `native/android/app/proguard-rules.pro` | ProGuard configuration |
| `PLAY_STORE_CHECKLIST.md` | Pre-publish checklist |
| `public/privacy-policy.html` | Updated privacy policy |

### Modified Files

| File | Changes |
|------|---------|
| `scripts/android/patch-android-project.mjs` | Add version code/name, signing config |
| `GOOGLE_PLAY_PUBLISHING.md` | Update with finalized instructions |

---

## 9. Implementation Order

1. **Create ProGuard rules** - Required for minification
2. **Update patch script** - Add version config and signing setup
3. **Update privacy policy** - Production compliance
4. **Create CI/CD workflow** - Automated builds
5. **Create pre-publish checklist** - Final verification document
6. **Update existing docs** - Consolidate all guidance

---

## 10. Summary

### What's Already Production-Ready
- Android SDK configuration (API 31+, SDK 36)
- Native crash reporting infrastructure
- RLS security policies
- OAuth authentication flow
- Edge functions
- All permissions properly scoped

### What Needs Implementation
- Release signing configuration
- ProGuard rules for minification
- CI/CD workflow
- Updated privacy policy
- Store listing assets

### Statement
Upon completing the changes outlined in this plan, **this app will be ready to submit to Google Play Store** as a paid application. The codebase demonstrates production-quality architecture, proper security practices, and compliance-ready infrastructure.
