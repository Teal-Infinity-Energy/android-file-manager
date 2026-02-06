

# Google Play Store Screenshots Design Specification

## Overview

This document provides detailed specifications for capturing **8 Google Play Store screenshots** for OneTap - a premium paid Android app that provides instant home screen access to files, links, contacts, and reminders.

---

## Global Requirements Checklist

| Requirement | Status |
|-------------|--------|
| Aspect ratio: 9:16 | Required |
| Real app UI only | Required |
| No mockups/fake data | Required |
| No emojis in overlays | Required |
| One idea per screenshot | Required |
| Under 3 seconds to understand | Required |
| Consistent device frame | Required |
| Clean status bar | Required |

---

## Visual Consistency Standards

- **Device**: Use a single Android phone for all captures (Pixel-style recommended)
- **Status bar**: Set to clean state - full battery, Wi-Fi connected, minimal icons
- **Theme**: Use light mode (default app theme) for maximum visibility
- **Wallpaper**: Simple, dark gradient or solid color to contrast with shortcut icons
- **Overlay placement**: Bottom third of screen with semi-transparent gradient backdrop
- **Typography**: Sans-serif, high contrast white text on dark gradient

---

## Screenshot Specifications

### Screenshot 1: Core Promise

**Purpose**: Establish the app philosophy - instant access without distraction.

**App State to Capture**:
- Android home screen with 5-7 created shortcuts visible
- Shortcuts should include a mix of:
  - URL shortcuts (e.g., YouTube, a news site)
  - PDF document shortcut
  - Photo/slideshow shortcut
  - Contact call shortcut
  - WhatsApp shortcut
- Clean wallpaper (dark gradient)
- No app drawer open, no notifications

**Capture Instructions**:
1. Create 5-7 demo shortcuts of varied types
2. Arrange them in a clean grid on home screen
3. Use a minimal dark wallpaper
4. Capture the home screen itself (not the app)

**Overlay Text**:
- **Headline**: "One tap to what matters"
- **Subtext**: "Instant access. No distractions."

---

### Screenshot 2: URL Shortcut Creation

**Purpose**: Demonstrate the simplest and most common use case.

**App State to Capture**:
- The ShortcutCustomizer screen (`src/components/ShortcutCustomizer.tsx`)
- URL source visible in ContentPreview component
- Name input field with a recognizable name (e.g., "YouTube")
- Platform icon visible (YouTube logo)
- "Add to Home Screen" button at bottom

**Capture Instructions**:
1. Navigate to Access tab
2. Tap "Link" button in grid
3. Enter a recognizable URL (youtube.com)
4. Proceed to customize step
5. Capture at the customization screen showing the preview

**Overlay Text**:
- **Headline**: "Open what you need. Instantly."

---

### Screenshot 3: PDF Access

**Purpose**: Build trust for document reading use cases.

**App State to Capture**:
- Native PDF viewer activity (`NativePdfViewerActivity.java`)
- PDF document open mid-page (not page 1)
- Clean reading UI visible (top bar with close and open-with buttons)
- Multi-page document showing continuous scroll

**Capture Instructions**:
1. Create a PDF shortcut with a multi-page document (e.g., book, notes)
2. Open the PDF via the shortcut
3. Scroll to middle of document
4. Let the header auto-hide or tap to show minimal UI
5. Capture while reading

**Overlay Text**:
- **Headline**: "Resume reading in one tap"
- **Subtext**: "Books. Notes. Documents."

---

### Screenshot 4: Photo Slideshow Access

**Purpose**: Personal content access - photos and memories.

**App State to Capture**:
- Slideshow viewer screen (`src/pages/SlideshowViewer.tsx`)
- A personal photo visible (landscape image recommended)
- Navigation controls visible (dots, arrows)
- Image counter visible (e.g., "3 / 8")

**Capture Instructions**:
1. Create a slideshow shortcut with 5-8 personal photos
2. Open the slideshow via the shortcut
3. Navigate to a visually appealing image
4. Tap to show controls
5. Capture with controls visible

**Overlay Text**:
- **Headline**: "Your memories. Right there."

---

### Screenshot 5: WhatsApp Access

**Purpose**: Fast communication without automation.

**App State to Capture**:
- The ContactShortcutCustomizer in message mode, OR
- The WhatsApp message chooser dialog (native Android dialog)
- Contact name visible
- "Quick Messages" section showing 2-3 message templates

**Capture Instructions**:
1. Navigate to Access tab
2. Tap "Contact" button
3. Select "WhatsApp" mode
4. Pick a contact
5. In customization, add 2-3 quick message templates
6. Capture the quick messages editor section visible

**Overlay Text**:
- **Headline**: "Say it faster"
- **Subtext**: "Always in your control."

---

### Screenshot 6: Contact Call Access

**Purpose**: Emotional and practical value - reach people quickly.

**App State to Capture**:
- ContactShortcutCustomizer in dial mode (`src/components/ContactShortcutCustomizer.tsx`)
- Contact avatar visible (or initials fallback)
- Contact name displayed prominently
- Phone icon visible
- "Add to Home Screen" button at bottom

**Capture Instructions**:
1. Navigate to Access tab
2. Tap "Contact" button
3. Select "Call" mode
4. Pick a contact with a photo (or use initials)
5. Capture at the customization screen

**Overlay Text**:
- **Headline**: "Reach the people that matter"

---

### Screenshot 7: Scheduled Reminders

**Purpose**: Time-based access and proactive notifications.

**App State to Capture**:
- ScheduledTimingPicker component (`src/components/ScheduledTimingPicker.tsx`)
- Time wheel picker visible
- Quick preset cards visible (Morning, Afternoon, etc.)
- Recurrence options visible (Once, Daily, Weekly)

**Capture Instructions**:
1. Navigate to Reminders tab
2. Tap "+" to create new reminder
3. Select a destination (URL or contact)
4. Proceed to timing step
5. Capture the timing picker with time wheel and presets visible

**Overlay Text**:
- **Headline**: "Reminders that lead to action"

---

### Screenshot 8: Trust and Control (Profile/Settings)

**Purpose**: Justify paying for the app - privacy, no ads, user control.

**App State to Capture**:
- ProfilePage component (`src/components/ProfilePage.tsx`)
- Signed OUT state preferred (cleaner)
- Shows "Sign in to sync" with cloud sync benefits
- Usage Insights section visible below

**Capture Instructions**:
1. Navigate to Profile tab
2. Ensure user is signed out
3. Scroll to show both the sign-in prompt and usage insights
4. Capture showing optional cloud sync messaging

**Overlay Text**:
- **Headline**: "Your device. Your data."
- **Subtext**: "No ads. No tracking."

---

## Play Store Compliance Notes

1. **Data Safety Declaration**:
   - The app declares collection of optional account info (email, name) for cloud sync
   - All data encrypted in transit via Supabase
   - No data shared with third parties
   - Privacy Policy at `/privacy-policy.html`

2. **Screenshot Accuracy**:
   - All screenshots must reflect real app functionality
   - No implied features that do not exist
   - Overlay text must not make unverifiable claims

3. **Content Guidelines**:
   - No personal contact information visible in screenshots
   - Use placeholder/demo content for contacts and documents
   - Blur or redact any sensitive information

---

## Technical Details for Capture

| Setting | Value |
|---------|-------|
| Resolution | 1080 x 1920 minimum |
| Format | PNG (lossless) |
| Device frame | Optional but consistent |
| Status bar time | Use 9:41 or similar neutral time |
| Battery icon | Full or high |
| Network icon | Wi-Fi connected |

---

## Capture Preparation Checklist

Before capturing:
- [ ] Install the production build of the app
- [ ] Create all necessary demo shortcuts (URL, PDF, photo, contact, WhatsApp)
- [ ] Prepare a clean home screen arrangement
- [ ] Set a dark, minimal wallpaper
- [ ] Sign out of the app (for Screenshot 8)
- [ ] Enable Do Not Disturb to prevent notification interruptions
- [ ] Clear status bar clutter

---

## Summary: Screenshot Order

| # | Focus | Headline | Key UI |
|---|-------|----------|--------|
| 1 | Core Promise | "One tap to what matters" | Home screen with shortcuts |
| 2 | URL Shortcut | "Open what you need. Instantly." | ShortcutCustomizer |
| 3 | PDF Access | "Resume reading in one tap" | NativePdfViewerActivity |
| 4 | Photo Slideshow | "Your memories. Right there." | SlideshowViewer |
| 5 | WhatsApp Access | "Say it faster" | Quick Messages editor |
| 6 | Contact Call | "Reach the people that matter" | ContactShortcutCustomizer |
| 7 | Reminders | "Reminders that lead to action" | ScheduledTimingPicker |
| 8 | Trust/Control | "Your device. Your data." | ProfilePage (signed out) |

