# OneTap - Google Play Store Publishing Guide

> **See also:**
> - `PLAY_STORE_CHECKLIST.md` - Step-by-step pre-publish checklist
> - `RELEASE_PROCESS.md` - Tagging, CI, and promotion workflow
> - `.github/workflows/android-release.yml` - Automated CI/CD workflow
> - `scripts/android/patch-android-project.mjs` - Build configuration with signing

OneTap is a **paid app (one-time purchase)**. No ads, no subscriptions, no in-app purchases.

---

## Quick Start

```bash
# 1. Generate keystore (one-time)
keytool -genkey -v -keystore onetap-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias onetap-key

# 2. Build release
npm run build
npx cap sync android
ONETAP_VERSION_CODE=1 ONETAP_VERSION_NAME=1.0.0 node scripts/android/patch-android-project.mjs
cd android && ./gradlew bundleRelease

# 3. Find AAB
ls -la app/build/outputs/bundle/release/
```

For CI/CD, push a tag like `v1.0.0` to trigger automated builds.

---

## Signing Configuration

The `patch-android-project.mjs` script automatically configures signing:

```groovy
android {
    signingConfigs {
        release {
            storeFile = file('path/to/onetap-upload-key.jks')
            storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ''
            keyAlias = 'onetap-key'
            keyPassword = System.getenv("KEY_PASSWORD") ?: ''
        }
    }
    buildTypes {
        release {
            signingConfig = signingConfigs.release
            minifyEnabled = false
            shrinkResources = false
        }
    }
}
```

Uses modern Gradle DSL syntax (`=` assignments) for Gradle 9/10 compatibility.

---

## Store Listing

### App Information

- **App name:** "OneTap Shortcuts" (max 30 chars)
- **Short description (80 chars):** "Create home screen shortcuts for any URL, video, or file instantly."
- **Full description (4000 chars):** Detailed feature list, benefits, use cases

### Graphics Assets (Required)

| Asset | Size | Notes |
|-------|------|-------|
| App icon | 512x512 PNG | High-res, no transparency |
| Feature graphic | 1024x500 PNG | Shown at top of listing |
| Screenshots | Min 2, phone size | 16:9 or 9:16 aspect ratio |
| Screenshots | Tablet (optional) | 7" and 10" tablets |

### Categorization

- **Category:** Tools or Productivity
- **Tags:** shortcuts, launcher, utility, home screen
- **Content rating:** Complete questionnaire (likely "Everyone")

---

## Pricing

- **Model:** Paid (one-time purchase)
- **Recommended range:** $1.99 – $4.99 USD
- **Google's cut:** 15% (first $1M/year), 30% after
- Set prices per country or use auto-conversion

---

## Distribution

- **Countries:** Select all or specific countries
- **Android versions:** Minimum Android 12 (API 31)
- **Device types:** Phone, Tablet, Chrome OS (optional)

---

## Privacy Policy

Hosted at `public/privacy-policy.html`. Covers:

- No personal data collected
- Shortcuts stored locally on device only
- Optional cloud sync uses encrypted transit
- No ads, no tracking, no third-party data sharing

---

## Data Safety Form

| Question | Answer |
|----------|--------|
| Collects user data? | Optional account info (email/name) for sync |
| Shares data with third parties? | No |
| Data encrypted in transit? | Yes |
| Users can request deletion? | Yes (via delete-account function) |

---

## Content Rating

Complete the IARC questionnaire:

- Violence: None
- Sexual content: None
- Language: None
- Controlled substances: None
- User interaction: None

**Expected rating:** Everyone / PEGI 3

---

## Submission Checklist

- [ ] App content rating completed
- [ ] Privacy policy URL added
- [ ] Data safety form completed
- [ ] Target audience and content declared
- [ ] Contact email provided
- [ ] AAB uploaded to internal track
- [ ] Tested on internal track
- [ ] Promoted to production (manually)

---

## Post-Launch

### Week 1
- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews
- [ ] Check download stats
- [ ] Verify purchase flow works

### Ongoing
- [ ] Regular updates (every 1-2 months minimum)
- [ ] Respond to all reviews
- [ ] Update target SDK as Google requires

---

*Last updated: February 2026*
