# OneTap Shortcuts — Play Store Checklist

> **Purpose of this document:** Walk you through everything Google requires to publish an Android app, with clear explanations of why each item exists and common rejection reasons to avoid. If you've never published an app before, follow this document from top to bottom.

---

## Table of Contents

1. [One-Time Setup (First Release Only)](#1-one-time-setup-first-release-only)
2. [App Content (Policy Compliance)](#2-app-content-policy-compliance)
3. [Store Listing](#3-store-listing)
4. [Pricing and Distribution](#4-pricing-and-distribution)
5. [Per-Release Checklist](#5-per-release-checklist)
6. [Common Rejection Reasons (and How to Avoid Them)](#6-common-rejection-reasons-and-how-to-avoid-them)
7. [How to Respond to Rejections](#7-how-to-respond-to-rejections)

---

## 1. One-Time Setup (First Release Only)

Do these steps once. You will not need to repeat them.

### 1.1 Create a Google Play Developer Account

1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay the one-time $25 registration fee
3. Complete identity verification (takes 24-48 hours)
4. Fill in your developer profile (name, email, website)

- [ ] Developer account created
- [ ] Identity verified

### 1.2 Set Up Payments (Required for Paid Apps)

1. In Play Console → Monetize → Payments profile
2. Create a merchant account
3. Link your bank account for payouts

- [ ] Merchant account created
- [ ] Bank account linked

### 1.3 Create the App Listing

1. In Play Console → All apps → Create app
2. Fill in:
   - **App name:** OneTap Shortcuts
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Paid

- [ ] App created in Play Console

### 1.4 Generate Signing Key

```bash
keytool -genkey -v -keystore onetap-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias onetap-key
```

You'll be asked for:
- **Keystore password** — choose a strong password, write it down
- **Your name, org, etc.** — can be anything (not shown to users)
- **Key password** — can be the same as keystore password

- [ ] Keystore file created (`onetap-release.jks`)
- [ ] Passwords stored securely (password manager recommended)

⚠️ **DANGER:**
If you lose this keystore file AND you're not enrolled in Play App Signing, you can never update the app again. Back it up immediately to at least two secure locations.

### 1.5 Enroll in Google Play App Signing

1. In Play Console → Setup → App signing
2. Follow the enrollment steps

This lets Google manage the final signing key. If you ever lose your upload keystore, you can generate a new one and continue publishing.

- [ ] Enrolled in Play App Signing (strongly recommended)

### 1.6 Configure CI/CD Secrets

1. Create a service account: Play Console → Setup → API access → Create service account
2. Grant "Release manager" role
3. Download the JSON key file

Then add these to GitHub → your repo → Settings → Secrets and Variables → Actions:

| Secret Name | Value |
|-------------|-------|
| `KEYSTORE_BASE64` | Run: `base64 -w0 onetap-release.jks` and paste the output |
| `KEYSTORE_PASSWORD` | Your keystore password |
| `KEY_PASSWORD` | Your key password |
| `PLAY_SERVICE_ACCOUNT_JSON` | Paste the entire JSON key file contents |

- [ ] Service account created with "Release manager" role
- [ ] All four GitHub Secrets configured

---

## 2. App Content (Policy Compliance)

Google requires you to declare specific information about your app before publishing.

### 2.1 Privacy Policy

Google requires a privacy policy URL for all apps. This project includes one at `public/privacy-policy.html`.

**Before submitting, verify:**
- [ ] Privacy policy is accessible at your app's URL (e.g., `https://[your-domain]/privacy-policy.html`)
- [ ] It mentions what data is collected (email, name via Google sign-in — optional)
- [ ] It mentions data is stored locally, optionally synced to cloud
- [ ] It mentions no analytics, no ads, no third-party sharing
- [ ] It includes how to delete data (in-app account deletion)
- [ ] It includes a contact email

### 2.2 Data Safety Form

Fill this out in Play Console → Policy → App content → Data safety.

| Question | Your Answer | Why |
|----------|------------|-----|
| Does your app collect or share user data? | Yes | Email and name collected via optional Google sign-in |
| **Personal info → Email address** | Collected, not shared | Used for cloud sync authentication |
| **Personal info → Name** | Collected, not shared | Display name from Google account |
| Is data encrypted in transit? | Yes | Supabase uses HTTPS for all connections |
| Can users request data deletion? | Yes | Via in-app "Delete Account" feature |
| Is data collected from all users? | Optional | Only if the user signs in (sign-in is optional) |

- [ ] Data safety form completed

### 2.3 Content Rating

Complete the IARC questionnaire in Play Console → Policy → App content → Content rating.

| Category | Answer |
|----------|--------|
| Violence | None |
| Fear | None |
| Sexuality | None |
| Language | None |
| Controlled substances | None |
| Miscellaneous | None |
| Interactive elements | None |

**Expected rating:** Everyone / PEGI 3

- [ ] Content rating questionnaire completed

### 2.4 Target Audience

- [ ] Target age group: **18+** (safest option — avoids children's privacy requirements)
- [ ] App is NOT designed primarily for children
- [ ] No child-appealing elements (cartoon characters, bright games, etc.)

### 2.5 Declarations

- [ ] App is NOT a news app
- [ ] App does NOT contain ads
- [ ] App does NOT use government IDs

---

## 3. Store Listing

### 3.1 App Information

| Field | Value | Character Limit |
|-------|-------|----------------|
| **App name** | OneTap - Quick Shortcuts | 30 characters |
| **Short description** | Create instant home screen shortcuts for any URL, contact, or file. | 80 characters |
| **Full description** | Detailed feature list (see GOOGLE_PLAY_PUBLISHING.md for template) | 4000 characters |

- [ ] App name set
- [ ] Short description set
- [ ] Full description set

### 3.2 Graphics Assets

| Asset | Size | Required? | Notes |
|-------|------|----------|-------|
| **App icon** | 512×512 PNG | Yes | High-resolution, no transparency, no rounded corners (Google applies its own) |
| **Feature graphic** | 1024×500 PNG | Yes | Displayed at the top of your Play Store listing |
| **Phone screenshots** | Min 2 | Yes | 16:9 or 9:16 aspect ratio, show actual app screens |
| **7" tablet screenshots** | At least 1 | Recommended | If your app supports tablets |
| **10" tablet screenshots** | At least 1 | Recommended | If your app supports tablets |

**Recommended screenshot order:**
1. Home screen with shortcuts visible
2. Creating a URL shortcut
3. Built-in PDF reader
4. Video player with picture-in-picture
5. Contact shortcuts
6. Scheduled reminders
7. Icon customization
8. Cloud sync / profile screen

- [ ] App icon uploaded
- [ ] Feature graphic uploaded
- [ ] Phone screenshots uploaded (minimum 2)

### 3.3 Contact Details

- [ ] Developer email provided
- [ ] Website URL (optional but recommended)

---

## 4. Pricing and Distribution

### 4.1 Pricing

- [ ] App set as **Paid**
- [ ] Default price set (recommended: $1.99 – $4.99 USD)
- [ ] Per-country pricing reviewed (Google auto-converts, but review for reasonableness)

**Good to know:** Google takes 15% of the first $1M in annual revenue, then 30% after that.

### 4.2 Countries

- [ ] Countries selected (all countries or specific markets)

### 4.3 Device Targeting

| Device Type | Supported? |
|------------|-----------|
| Phone | ✅ Yes |
| Tablet | ✅ Yes |
| Chrome OS | Optional |
| Android TV | ❌ No |
| Wear OS | ❌ No |

- [ ] Device types configured

---

## 5. Per-Release Checklist

Use this for every release after the first one.

- [ ] All changes merged to `main` via reviewed PR
- [ ] Tested on physical device
- [ ] All shortcut types work
- [ ] Reminders work
- [ ] Sync works (if signed in)
- [ ] Offline mode works
- [ ] `whatsnew/en-US.txt` updated with user-facing changes
- [ ] Version tag created and pushed (e.g., `git tag v1.0.1 && git push origin v1.0.1`)
- [ ] CI build succeeded
- [ ] Tested on internal track
- [ ] Promoted to production (when ready)
- [ ] Monitored Play Console for crashes (first 48 hours)

---

## 6. Common Rejection Reasons (and How to Avoid Them)

### Critical (Will Definitely Cause Rejection)

| Rejection Reason | How to Prevent |
|-----------------|---------------|
| App crashes on launch | Test on a clean device (factory reset or new emulator) |
| Privacy policy URL is broken (404) | Verify the URL works in a browser before submitting |
| Core functionality is broken | Run through the full testing checklist |
| Data safety form doesn't match reality | Audit what data your app actually collects |
| Missing permission justification | Document why each permission is needed in the manifest |

### Moderate (May Cause Rejection)

| Rejection Reason | How to Prevent |
|-----------------|---------------|
| Low quality screenshots | Use device frames, high resolution, actual app content |
| Vague or misleading description | Be specific about what the app does |
| Wrong content rating | Answer the IARC questionnaire honestly |
| App requires permissions not justified by functionality | Only request permissions you actually need |

### Minor (Unlikely to Cause Rejection, But Can)

| Rejection Reason | How to Prevent |
|-----------------|---------------|
| Typos in listing | Proofread everything |
| Outdated contact info | Make sure your developer email works |
| Missing tablet screenshots | Add them if your app supports tablets |

---

## 7. How to Respond to Rejections

Google Play rejections are not personal. They happen frequently, even to experienced developers. Here's how to handle them calmly.

### Step 1: Read the rejection email carefully

Google will tell you the specific policy your app violated. Read it twice. The reason is usually more specific than you expect.

### Step 2: Fix the issue

| Rejection Type | What to Do |
|---------------|-----------|
| **Policy violation** | Change the app behavior or listing to comply |
| **Broken functionality** | Fix the bug, test thoroughly, resubmit |
| **Missing declaration** | Complete the required form in Play Console |
| **Misleading listing** | Update your description and screenshots to accurately reflect the app |

### Step 3: Resubmit

After fixing the issue:
1. Upload a new AAB (if you changed code)
2. Update the listing (if you changed text/screenshots)
3. Submit for review again

### Step 4: If you disagree with the rejection

You can appeal through Play Console → click the rejection notification → "Appeal" or "Contact support." Be factual, calm, and specific about why you believe the rejection is incorrect.

**Typical review time:** 3-7 days for first submission, 1-3 days for updates.

---

## Emergency Contacts

- **Play Console Help:** [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer/)
- **Policy Questions:** [Play Policy Center](https://play.google.com/console/about/policy/)
- **App Signing Help:** [Play App Signing documentation](https://developer.android.com/studio/publish/app-signing)

---

*Last updated: February 2026*
