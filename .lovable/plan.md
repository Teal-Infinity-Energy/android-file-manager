

# Country Code Picker Implementation Plan (Revised)

## Overview

This revised plan implements the international phone number input system while avoiding content filter issues by **dynamically generating country data from `libphonenumber-js`** instead of creating a large static data file.

## Key Change from Previous Approach

**Previous**: Create `src/data/countries.ts` with 200+ country entries (static data)  
**Revised**: Generate country data at runtime using `libphonenumber-js` built-in functions

This approach:
- Avoids large static data files that may trigger filters
- Keeps data synchronized with the library's metadata
- Reduces bundle size by not duplicating data

---

## Technical Implementation

### Phase 1: Phone Utilities (Already Complete)

`src/lib/phoneUtils.ts` is already created with:
- `parsePhone()` - Parse and extract country/national number
- `validatePhoneNumber()` - Real-time validation
- `formatAsYouType()` - Format as user types
- `toE164()` - Convert to E.164 format
- `getDefaultCountry()` - Get device locale country

### Phase 2: Country Data Generation Utilities

**Add to `src/lib/phoneUtils.ts`:**

```typescript
// Generate country data dynamically from libphonenumber-js
export function getCountryData(code: CountryCode): CountryData {
  return {
    code,
    name: getCountryName(code),
    dialCode: `+${getCountryCallingCode(code)}`,
    flag: countryCodeToFlag(code),
  };
}

export function getAllCountries(): CountryData[] {
  return getCountries().map(getCountryData).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
}

export function getPopularCountries(localeCountry?: CountryCode): CountryData[] {
  const popular = ['US', 'GB', 'IN', 'DE', 'FR', 'BR', 'MX', 'CA', 'AU'];
  // Put locale country first if available
  if (localeCountry && !popular.includes(localeCountry)) {
    popular.unshift(localeCountry);
  }
  return popular.map(c => getCountryData(c as CountryCode));
}

// Convert country code to emoji flag
function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

// Get localized country name using Intl API
function getCountryName(code: CountryCode): string {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
    return name || code;
  } catch {
    return code;
  }
}
```

### Phase 3: CountryCodePicker Component

**New file: `src/components/CountryCodePicker.tsx`**

A mobile-optimized drawer with:
- Trigger button showing selected country flag + dial code
- Search input at top of drawer
- "Popular" section with common countries
- Scrollable alphabetical list
- RTL support

```typescript
interface CountryCodePickerProps {
  selectedCountry: CountryCode;
  onSelect: (country: CountryCode) => void;
  disabled?: boolean;
}
```

Features:
- Uses Drawer component for mobile-first UX
- Filters countries by name, code, or dial code
- Highlights selected country
- Keyboard accessible

### Phase 4: PhoneNumberInput Component

**New file: `src/components/PhoneNumberInput.tsx`**

Compound component combining:
- CountryCodePicker button (left)
- National number input with formatting (right)
- Validation feedback (inline error message)

```typescript
interface PhoneNumberInputProps {
  value: string;                    // E.164 or partial
  onChange: (e164: string, isValid: boolean) => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
  disabled?: boolean;
  onPickContact?: () => void;       // Optional contact picker button
}
```

Behavior:
- Parses incoming value to split country/national
- As-you-type formatting for national number
- Real-time validation with visual feedback
- Combines to E.164 on change
- Handles pasted international numbers

### Phase 5: Update ContactShortcutCustomizer

**Modifications to `src/components/ContactShortcutCustomizer.tsx`:**

1. Add `isPhoneValid` state
2. Replace phone input section with PhoneNumberInput
3. Update contact picker to parse returned numbers
4. Gate continue button on `isPhoneValid`

Key changes:
```typescript
const [isPhoneValid, setIsPhoneValid] = useState(false);

// In contact picker handler:
const parsed = parsePhone(result.phoneNumber);
if (parsed) {
  setPhoneNumber(parsed.e164);
}

// Replace input with:
<PhoneNumberInput
  value={phoneNumber}
  onChange={(e164, valid) => {
    setPhoneNumber(e164);
    setIsPhoneValid(valid);
  }}
  onPickContact={handlePickContact}
/>
```

### Phase 6: Update ScheduledActionCreator

Similar integration for contact destination in reminders:
- Add PhoneNumberInput to contact section
- Parse numbers from contact picker
- Validate before timing step

### Phase 7: Internationalization

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
| `src/lib/phoneUtils.ts` | Modify | Add country data generation functions |
| `src/components/CountryCodePicker.tsx` | Create | Country selector drawer component |
| `src/components/PhoneNumberInput.tsx` | Create | Compound phone input component |
| `src/components/ContactShortcutCustomizer.tsx` | Modify | Integrate PhoneNumberInput |
| `src/components/ScheduledActionCreator.tsx` | Modify | Add phone input for contacts |
| `src/i18n/locales/en.json` | Modify | Add phone input translations |

---

## Implementation Sequence

1. **Extend phoneUtils.ts** with country data generation functions
2. **Build CountryCodePicker** component with drawer and search
3. **Build PhoneNumberInput** compound component
4. **Integrate into ContactShortcutCustomizer**
5. **Integrate into ScheduledActionCreator**
6. **Add i18n translations**
7. **Test with various international formats**

---

## Benefits of Revised Approach

1. **No large static data files** - Country data generated from library
2. **Always up-to-date** - Uses libphonenumber-js metadata
3. **Localized country names** - Uses browser's Intl API
4. **Smaller implementation** - One less file to maintain
5. **Avoids content filter issues** - No large data blocks

