# OneTap - Google Play Store Pre-Publish Checklist

This checklist ensures everything is ready before publishing OneTap to the Google Play Store.

---

## One-Time Setup (First Release Only)

### Developer Account

- [ ] Create Google Play Developer account ($25 one-time fee)
- [ ] Complete identity verification (24-48 hours)
- [ ] Set up developer profile (name, email, website)
- [ ] Create merchant account for payments (Monetize → Payments profile)
- [ ] Link bank account for payouts

### App Creation

- [ ] Create new app in Play Console
  - Package name: `app.onetap.shortcuts`
  - Default language: English (United States)
  - App or game: App
  - Free or paid: Paid

### Signing Key

- [ ] Generate release keystore:
  ```bash
  keytool -genkey -v -keystore onetap-release.jks \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -alias onetap-key
  ```
- [ ] Store keystore file securely (NEVER lose this!)
- [ ] Store passwords securely
- [ ] Enroll in Google Play App Signing (recommended)

### CI/CD Secrets (GitHub)

- [ ] `KEYSTORE_BASE64`: Base64-encoded keystore
  ```bash
  base64 -w0 onetap-release.jks > keystore_base64.txt
  ```
- [ ] `KEYSTORE_PASSWORD`: Keystore password
- [ ] `KEY_PASSWORD`: Key alias password
- [ ] `PLAY_SERVICE_ACCOUNT_JSON`: Service account credentials
  - Play Console → Setup → API access
  - Create service account with "Release manager" role
  - Download JSON key file

---

## App Content (Policy Compliance)

### Privacy Policy

- [ ] Privacy policy is live at: `https://[your-domain]/privacy-policy.html`
- [ ] URL is accessible (not 404)
- [ ] Policy mentions:
  - [ ] What data is collected (email, name via Google OAuth)
  - [ ] Data is stored locally and optionally synced
  - [ ] No analytics or ads
  - [ ] How to delete data
  - [ ] Contact email

### Data Safety Form

Complete in Play Console → Policy → App content → Data safety:

| Question | Answer |
|----------|--------|
| Does your app collect or share user data? | Yes |
| **Data Types Collected:** | |
| → Personal info > Email address | Collected, not shared |
| → Personal info > Name | Collected, not shared |
| **Data Usage:** | |
| → Is data encrypted in transit? | Yes |
| → Can users request data deletion? | Yes |
| → Is data collected from all users or optional? | Optional (only if signed in) |

### Content Rating

Complete IARC questionnaire:
- [ ] Violence: None
- [ ] Fear: None
- [ ] Sexuality: None
- [ ] Language: None
- [ ] Controlled substances: None
- [ ] Miscellaneous: None
- [ ] Interactive elements: None
- [ ] Expected rating: Everyone / PEGI 3

### Target Audience

- [ ] Target age group: 18+ (safest option)
- [ ] App is NOT designed primarily for children
- [ ] No child-appealing elements

### News Apps Declaration

- [ ] App is NOT a news app

### App Category

- [ ] Category: Tools OR Productivity
- [ ] Tags: shortcuts, launcher, utility, productivity

---

## Store Listing

### App Details

- [ ] **App name** (30 chars max): `OneTap - Quick Shortcuts`
- [ ] **Short description** (80 chars max):
  > Create instant home screen shortcuts for any URL, contact, or file.
- [ ] **Full description** (4000 chars max): See GOOGLE_PLAY_PUBLISHING.md

### Graphics

| Asset | Size | Status |
|-------|------|--------|
| Hi-res icon | 512×512 PNG | [ ] Uploaded |
| Feature graphic | 1024×500 PNG | [ ] Uploaded |
| Phone screenshots (min 2) | 16:9 or 9:16 | [ ] Uploaded |
| 7" tablet screenshots | Optional | [ ] Uploaded |
| 10" tablet screenshots | Optional | [ ] Uploaded |

### Screenshots Order

1. "One tap to what matters" - Home screen with shortcuts
2. "Create shortcuts in seconds" - URL creation flow
3. "Built-in PDF reader" - Native PDF viewer
4. "Picture-in-picture support" - Video player
5. "Instant contact access" - Contact shortcuts
6. "Never forget with reminders" - Scheduled notifications
7. "Personalize your shortcuts" - Icon customization
8. "Sync across devices" - Cloud sync / profile

### Contact Details

- [ ] Developer email: [your-email]
- [ ] Website URL: [optional]
- [ ] Phone number: [optional]

---

## Pricing & Distribution

### Pricing

- [ ] Set as "Paid"
- [ ] Default price: $2.99 USD (or your choice)
- [ ] Review per-country pricing
- [ ] Confirm tax settings

### Countries

- [ ] Select all countries OR specific markets
- [ ] Consider excluding countries with:
  - High piracy rates
  - Payment processing issues

### Device Targeting

- [ ] Phone: Yes
- [ ] Tablet: Yes
- [ ] Chrome OS: Optional
- [ ] Android TV: No
- [ ] Wear OS: No

---

## Release Preparation

### Before Each Release

- [ ] Update version in patch script or environment:
  - `ONETAP_VERSION_CODE`: Increment by 1
  - `ONETAP_VERSION_NAME`: Semantic version (e.g., 1.0.0)

### Build Verification

```bash
# 1. Build web app
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Apply patches
node scripts/android/patch-android-project.mjs

# 4. Build release AAB
cd android && ./gradlew bundleRelease

# 5. Verify AAB exists
ls -la app/build/outputs/bundle/release/
```

- [ ] AAB file created successfully
- [ ] No build errors or warnings

### Testing

- [ ] Install on physical device
- [ ] Test all shortcut types:
  - [ ] URL shortcuts open correctly
  - [ ] Contact call shortcuts work
  - [ ] Contact message shortcuts work
  - [ ] WhatsApp shortcuts work
  - [ ] PDF shortcuts open native viewer
  - [ ] Video shortcuts play correctly
  - [ ] File shortcuts open files
  - [ ] Slideshow shortcuts work
- [ ] Test scheduled reminders
- [ ] Test cloud sync (if signed in)
- [ ] Test on multiple Android versions (12, 13, 14, 15)
- [ ] Test permission handling:
  - [ ] Deny all permissions - app doesn't crash
  - [ ] Grant permissions - features work
  - [ ] Revoke permissions - graceful degradation

### Release Notes

- [ ] Write clear, concise release notes
- [ ] Create `whatsnew/en-US.txt` for CI/CD:
  ```
  - [New feature 1]
  - [Bug fix 1]
  - [Improvement 1]
  ```

---

## Submission

### Upload

- [ ] Go to Release → Production (or Internal for first upload)
- [ ] Create new release
- [ ] Upload AAB file
- [ ] Add release notes
- [ ] Review changes

### Final Checks

- [ ] All policy declarations completed
- [ ] All required graphics uploaded
- [ ] Privacy policy URL works
- [ ] Pricing set correctly
- [ ] Countries selected
- [ ] No policy warnings in Play Console

### Submit

- [ ] Click "Review release"
- [ ] Confirm all green checkmarks
- [ ] Click "Start rollout to Production"

---

## Post-Submission

### Monitoring

- [ ] Check Play Console for review status
- [ ] Typical review time: 3-7 days (first release)
- [ ] Watch for policy violation emails

### If Rejected

Common reasons and fixes:

| Rejection Reason | Fix |
|-----------------|-----|
| Privacy policy not accessible | Verify URL works, has HTTPS |
| Broken functionality | Fix and resubmit |
| Permission justification | Add detailed description in manifest |
| Misleading description | Update store listing |
| Missing data safety info | Complete data safety form |

### After Approval

- [ ] Verify app is live on Play Store
- [ ] Test in-app purchase flow (if applicable)
- [ ] Monitor for crashes in Play Console
- [ ] Set up crash/ANR alerts
- [ ] Respond to user reviews

---

## Common Rejection Risks

### Critical

| Risk | Mitigation |
|------|------------|
| App crashes on launch | Test on clean device |
| Permissions not justified | Document each permission's purpose |
| Privacy policy URL broken | Host on reliable service |
| Core functionality broken | Full QA before submission |

### Moderate

| Risk | Mitigation |
|------|------------|
| Low quality screenshots | Use device frames, good resolution |
| Vague description | Be specific about features |
| Wrong content rating | Answer IARC honestly |
| Data safety mismatch | Audit actual data collection |

### Minor

| Risk | Mitigation |
|------|------------|
| Typos in listing | Proofread carefully |
| Missing tablet screenshots | Add if you support tablets |
| Outdated contact info | Verify email works |

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | TBD | Initial release |

---

## Emergency Contacts

- Google Play Console Support: [Play Console Help](https://support.google.com/googleplay/android-developer/)
- Policy Clarification: [Policy Center](https://play.google.com/console/about/policy/)
