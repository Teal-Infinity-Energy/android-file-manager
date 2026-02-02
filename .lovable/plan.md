
# Country Code Picker Implementation Plan

## Overview

This plan implements a robust, international phone number input system with a separate country code picker. The feature will enhance the existing `ContactShortcutCustomizer.tsx` and `ScheduledActionCreator.tsx` components to handle phone numbers from any country with proper validation.

## Current State

**Existing Implementation:**
- Phone number is stored as a single string in `phoneNumber` field
- No country code separation or validation
- Contact picker returns raw phone number from Android contacts
- WhatsApp/Call shortcuts use the number as-is via `wa.me/` and `tel:` protocols

**Components Affected:**
- `src/components/ContactShortcutCustomizer.tsx` - Call/WhatsApp shortcut creation
- `src/components/ScheduledActionCreator.tsx` - Contact reminder creation
- Native Android contact picker returns phone numbers in various formats

## Design Decisions

### Approach: Dedicated Library (libphonenumber-js)

Using `libphonenumber-js` (lightweight, 150KB gzipped) provides:
- Parsing phone numbers to extract country code
- Validation rules for each country (digit lengths, patterns)
- Formatting for display
- Country detection from partial numbers

### Data Model

Phone numbers will be stored in **E.164 format** (e.g., `+14155552671`) for consistency and compatibility with WhatsApp/telephony intents. The UI will split this into:
- Country code dropdown (e.g., `+1`)
- National number input (e.g., `415 555 2671`)

### Country Code Picker UX

A mobile-optimized picker with:
1. **Search box** at top (searches country name, code, or dial code)
2. **Popular countries** section (based on device locale + common countries)
3. **Alphabetical list** with country flag, name, and dial code
4. **Bottom sheet drawer** for mobile-first experience

### Auto-Detection from Contact Picker

When a contact is selected:
1. Parse the returned phone number using `libphonenumber-js`
2. If parseable, extract country code and national number
3. If not parseable, attempt to detect country from device locale
4. Pre-fill both fields automatically

---

## Technical Implementation

### Phase 1: Install Dependencies

```bash
npm install libphonenumber-js
```

The library provides:
- `parsePhoneNumber(number, defaultCountry?)` - Parse and validate
- `getCountryCallingCode(countryCode)` - Get dial code for country
- `getCountries()` - List all country codes
- `AsYouType` - Format as user types
- `isValidPhoneNumber(number, countryCode?)` - Validation

### Phase 2: Create Country Code Picker Component

**New file: `src/components/CountryCodePicker.tsx`**

```text
CountryCodePicker
├── Props:
│   ├── selectedCountry: CountryCode (e.g., 'US')
│   ├── onSelect: (country: CountryCode) => void
│   └── disabled?: boolean
├── State:
│   ├── isOpen: boolean (drawer open state)
│   └── searchQuery: string
├── Features:
│   ├── Trigger button showing flag + dial code
│   ├── Drawer with search input
│   ├── Popular countries section
│   ├── Scrollable alphabetical list
│   └── RTL support for Arabic/Hebrew
```

**Country Data Structure:**
```typescript
interface CountryData {
  code: CountryCode;  // 'US', 'IN', 'GB'
  name: string;       // 'United States', 'India'
  dialCode: string;   // '+1', '+91', '+44'
  flag: string;       // '🇺🇸', '🇮🇳', '🇬🇧'
}
```

### Phase 3: Create Phone Number Input Component

**New file: `src/components/PhoneNumberInput.tsx`**

A compound component combining country picker + national number input:

```text
PhoneNumberInput
├── Props:
│   ├── value: string (E.164 format or partial)
│   ├── onChange: (e164Number: string, isValid: boolean) => void
│   ├── defaultCountry?: CountryCode (fallback if can't detect)
│   ├── placeholder?: string
│   └── disabled?: boolean
├── State:
│   ├── countryCode: CountryCode
│   ├── nationalNumber: string
│   └── isValid: boolean
├── Layout:
│   ├── [Country Picker Button] [National Number Input]
│   └── Validation error message (inline)
├── Behavior:
│   ├── As-you-type formatting within national number
│   ├── Real-time validation feedback
│   └── Combines to E.164 on change
```

**Validation Rules (per-country):**
- Minimum and maximum digit counts
- Valid number patterns (mobile, landline)
- Visual feedback (red border if invalid, green checkmark if valid)

### Phase 4: Update ContactShortcutCustomizer

**Modifications to `src/components/ContactShortcutCustomizer.tsx`:**

1. Replace single `Input` with `PhoneNumberInput` component
2. Add country detection from contact picker result
3. Store E.164 format in `phoneNumber` state
4. Pass validation state to continue button

```typescript
// Before (current)
<Input
  type="tel"
  value={phoneNumber}
  onChange={(e) => setPhoneNumber(e.target.value)}
/>

// After (new)
<PhoneNumberInput
  value={phoneNumber}
  onChange={(e164, isValid) => {
    setPhoneNumber(e164);
    setIsPhoneValid(isValid);
  }}
  defaultCountry={detectedCountry}
/>
```

**Contact Picker Integration:**
```typescript
const handlePickContact = async () => {
  const result = await ShortcutPlugin.pickContact();
  if (result.success && result.phoneNumber) {
    // Parse the number to extract country code
    const parsed = parsePhoneNumber(result.phoneNumber);
    if (parsed) {
      setPhoneNumber(parsed.number); // E.164 format
      setDetectedCountry(parsed.country);
    } else {
      // Fallback: use raw number with device locale country
      setPhoneNumber(result.phoneNumber);
    }
  }
};
```

### Phase 5: Update ScheduledActionCreator

Similar updates for contact destination in reminders:

1. Add country picker to contact input section
2. Parse numbers from contact picker
3. Validate before allowing timing step

### Phase 6: Internationalization

**Add to `src/i18n/locales/en.json`:**
```json
{
  "phoneInput": {
    "selectCountry": "Select country",
    "searchCountry": "Search countries...",
    "popularCountries": "Popular",
    "allCountries": "All countries",
    "invalidNumber": "Enter a valid phone number",
    "tooShort": "Number is too short",
    "tooLong": "Number is too long"
  }
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/CountryCodePicker.tsx` | Create | Country selector with search drawer |
| `src/components/PhoneNumberInput.tsx` | Create | Compound phone input component |
| `src/lib/phoneUtils.ts` | Create | Phone parsing/validation utilities |
| `src/data/countries.ts` | Create | Country data with flags and dial codes |
| `src/components/ContactShortcutCustomizer.tsx` | Modify | Integrate PhoneNumberInput |
| `src/components/ScheduledActionCreator.tsx` | Modify | Add phone input for contacts |
| `src/i18n/locales/en.json` | Modify | Add phone input translations |

---

## Country Data Handling

### Data Source

Use `libphonenumber-js` metadata for accurate dial codes and validation rules. For flags, use Unicode emoji flags (e.g., `🇺🇸` = `\u{1F1FA}\u{1F1F8}`).

### Popular Countries

Dynamically ordered based on:
1. Device locale country (top priority)
2. Common countries: US, UK, India, Germany, France, Brazil, Mexico, Canada, Australia

### Search Behavior

Search matches:
- Country name (partial match)
- Country code (`US`, `GB`)
- Dial code (`+1`, `+44`)

---

## Edge Cases and Error Handling

1. **No country detected**: Default to device locale or show "Select country" prompt
2. **Invalid number format**: Show inline validation message, disable continue button
3. **Pasted number with country code**: Parse and split into country + national
4. **Number changes country**: Auto-update country picker if user pastes full international number
5. **RTL languages**: Mirror layout for Arabic/Hebrew locales
6. **Landscape mode**: Maintain usable layout with side-by-side elements

---

## Backward Compatibility

Existing shortcuts with phone numbers will continue to work:
- Stored numbers already in international format work with WhatsApp/tel intents
- No migration needed for existing data
- New numbers will be stored in cleaner E.164 format

---

## Implementation Sequence

1. **Install libphonenumber-js** and create utility functions
2. **Create country data file** with flags, names, and codes
3. **Build CountryCodePicker** component with drawer and search
4. **Build PhoneNumberInput** compound component
5. **Integrate into ContactShortcutCustomizer**
6. **Integrate into ScheduledActionCreator**
7. **Add i18n translations**
8. **Test with various international formats**
