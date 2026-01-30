
# Fix: Shortcut Name Shows "Twitter/X Link" for Netflix URLs

## Root Cause

The `parseDeepLink` function in `src/lib/contentResolver.ts` checks platforms in order, and the Twitter/X check uses `host.includes('x.com')` which matches `netflix.com` (contains substring "x.com"). Since Twitter/X is checked **before** Netflix in the function, Netflix URLs incorrectly return "Twitter/X" as the platform.

**Code path:**
```
getContentName(source)
  → parseDeepLink(source.uri)
    → Line 68: host.includes('x.com')
    → "netflix.com".includes("x.com") → TRUE! 
    → Returns { platform: 'Twitter/X' }
  → Returns "Twitter/X Link" (wrong!)
```

Similarly, `getPlatformEmoji` at lines 106-122 has a bug where it checks `host.includes('x')` which matches any domain containing "x" including `netflix.com`.

## Solution

Two approaches to fix:

### Option 1: Move Netflix Before Twitter/X (Simple)
Move the Netflix check before the Twitter/X check so it matches first.

### Option 2: Use Exact Domain Matching (Robust) ← Recommended
Use a helper function to match only the exact domain (including subdomains), not substrings.

```typescript
function hostMatchesDomain(host: string, domain: string): boolean {
  // Match exact domain or subdomain (e.g., www.x.com, m.x.com)
  return host === domain || host.endsWith('.' + domain);
}
```

## Implementation

### File: `src/lib/contentResolver.ts`

**1. Add helper function (after line 54):**
```typescript
// Helper to match exact domain (including subdomains like www.x.com)
function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}
```

**2. Fix `parseDeepLink` (lines 57-103):**

Replace substring matches with exact domain matching for problematic short domains:

| Before | After |
|--------|-------|
| `host.includes('x.com')` | `hostMatchesDomain(host, 'x.com')` |

Full updated function:
```typescript
export function parseDeepLink(url: string): { platform: string; isDeepLink: boolean } {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    
    // Order matters less now with exact matching, but check specific before generic
    if (host.includes('instagram.com')) {
      return { platform: 'Instagram', isDeepLink: true };
    }
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return { platform: 'YouTube', isDeepLink: true };
    }
    // Use exact match for x.com to avoid matching netflix.com, fedex.com, etc.
    if (host.includes('twitter.com') || hostMatchesDomain(host, 'x.com')) {
      return { platform: 'X', isDeepLink: true };
    }
    if (host.includes('tiktok.com')) {
      return { platform: 'TikTok', isDeepLink: true };
    }
    if (host.includes('netflix.com')) {
      return { platform: 'Netflix', isDeepLink: true };
    }
    // ... rest unchanged ...
  } catch {
    return { platform: 'Web', isDeepLink: false };
  }
}
```

**3. Fix `getPlatformEmoji` (lines 106-122):**

The current logic checks `host.includes(key)` where key can be just `'x'` from `PLATFORM_EMOJIS`. This matches any domain containing "x".

Fix by using exact domain matching for short keys:
```typescript
export function getPlatformEmoji(url: string): string {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    
    // Check each platform key against the hostname
    for (const [key, emoji] of Object.entries(PLATFORM_EMOJIS)) {
      if (key === 'default') continue;
      
      // For very short keys (x, t), use exact domain matching
      if (key.length <= 2) {
        if (hostMatchesDomain(host, key + '.com') || hostMatchesDomain(host, key + '.me')) {
          return emoji;
        }
      } else if (host.includes(key)) {
        return emoji;
      }
    }
    
    return PLATFORM_EMOJIS.default;
  } catch {
    return PLATFORM_EMOJIS.default;
  }
}
```

**4. Also update branding from "Twitter/X" to just "X":**
The platform is now officially called "X", so the name should be updated.

## Testing

After the fix:
- `https://netflix.com/watch/123` → Name: "Netflix Link", Emoji: 🎬
- `https://x.com/user` → Name: "X Link", Emoji: 🐦
- `https://www.x.com/user` → Name: "X Link", Emoji: 🐦
- `https://fedex.com` → Name: "fedex.com" (generic), Emoji: 🔗

## Files to Modify

1. `src/lib/contentResolver.ts` - Add helper function and fix both `parseDeepLink` and `getPlatformEmoji`

## Summary

| Issue | Fix |
|-------|-----|
| `host.includes('x.com')` matches `netflix.com` | Use `hostMatchesDomain(host, 'x.com')` for exact matching |
| `host.includes('x')` matches any domain with "x" | Use exact matching for short platform keys |
| Platform name "Twitter/X" | Update to just "X" |
