

# Remove Background Colors from Home Screen Shortcut Icons

## Summary

Update the native Android shortcut icon rendering to display platform logos and favicons **without colored backgrounds** - just the authentic branded icons filling the entire icon space, like real native app icons.

## Current vs Expected Behavior

| Icon Type | Current (Home Screen) | Expected (Home Screen) |
|-----------|----------------------|------------------------|
| YouTube | White play icon on red square | Full YouTube logo (red + white) |
| Netflix | White 'N' on red square | Full Netflix 'N' with red color |
| Favicon | Small favicon on blue square | Favicon filling icon space |

## Technical Implementation

### 1. Native Android: `ShortcutPlugin.java`

#### A. Update `createPlatformIcon()` method

**Current behavior (lines 1486-1539):**
- Fills canvas with platform brand color
- Draws white/black icon at 45% size centered

**New behavior:**
- Transparent background (or white for adaptive icon mask compatibility)
- Draw platform SVG with its **native colors** at full size (using fill color directly)

```java
private Icon createPlatformIcon(String platformKey) {
    int adaptiveSize = 216;
    Bitmap bitmap = Bitmap.createBitmap(adaptiveSize, adaptiveSize, Bitmap.Config.ARGB_8888);
    Canvas canvas = new Canvas(bitmap);
    
    // White background for adaptive icon compatibility (masked by launcher)
    Paint bgPaint = new Paint();
    bgPaint.setColor(Color.WHITE);
    bgPaint.setStyle(Paint.Style.FILL);
    canvas.drawRect(0, 0, adaptiveSize, adaptiveSize, bgPaint);
    
    // Get platform-specific fill color (the brand color, not white)
    int iconColor = getPlatformColor(platformKey); // Use brand color as fill
    
    Path iconPath = getPlatformPath(platformKey);
    
    if (iconPath != null) {
        Paint iconPaint = new Paint();
        iconPaint.setColor(iconColor); // Brand color (red for YouTube, etc.)
        iconPaint.setAntiAlias(true);
        iconPaint.setStyle(Paint.Style.FILL);
        
        // Scale to fill ~80% of canvas (larger than before)
        float iconSize = adaptiveSize * 0.7f;  // Was 0.45
        // ... scale and center logic
        
        canvas.drawPath(iconPath, iconPaint);
    }
    
    return Icon.createWithAdaptiveBitmap(bitmap);
}
```

#### B. Update `createFaviconIcon()` method

**Current behavior (lines 1434-1483):**
- Blue `#3B82F6` background
- Favicon at 45% size centered

**New behavior:**
- White background (for adaptive icon mask)
- Favicon scaled to fill most of the icon space

```java
private Icon createFaviconIcon(String faviconUrl) {
    // ... fetch favicon ...
    
    // White background instead of blue
    Paint bgPaint = new Paint();
    bgPaint.setColor(Color.WHITE);
    bgPaint.setStyle(Paint.Style.FILL);
    canvas.drawRect(0, 0, adaptiveSize, adaptiveSize, bgPaint);
    
    // Scale favicon to ~70% of canvas (larger than 45%)
    float iconSize = adaptiveSize * 0.7f;
    // ... scale and center logic
    
    return Icon.createWithAdaptiveBitmap(bitmap);
}
```

### 2. React In-App: Already Correct

The in-app rendering in `MyShortcutsContent.tsx` and `IconPicker.tsx` already uses `noBg` mode which renders icons without backgrounds. This matches the new native behavior.

**Current in-app code (correct):**
```tsx
// MyShortcutsContent.tsx - platform icon
<PlatformIcon platform={platform} size="lg" noBg />

// MyShortcutsContent.tsx - favicon
<img src={icon.value} className="h-full w-full object-contain" />
```

### 3. React: Add Neutral Background Container

For visual consistency, the in-app containers should have a subtle neutral background (white/light gray) to match the adaptive icon appearance:

**Update MyShortcutsContent.tsx:**
```tsx
// Platform icons
if (icon.type === 'platform') {
  const platform = detectPlatform(`https://${icon.value}.com`);
  if (platform) {
    return (
      <div className="h-12 w-12 rounded-xl bg-white dark:bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
        <PlatformIcon platform={platform} size="lg" noBg />
      </div>
    );
  }
}

// Favicons
if (icon.type === 'favicon') {
  return (
    <div className="h-12 w-12 rounded-xl bg-white dark:bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
      <img src={icon.value} className="h-[70%] w-[70%] object-contain" />
    </div>
  );
}
```

**Update IconPicker.tsx preview similarly.**

## Files to Modify

| File | Changes |
|------|---------|
| `native/android/.../ShortcutPlugin.java` | `createPlatformIcon()`: White bg, brand-colored icon at 70% size |
| `native/android/.../ShortcutPlugin.java` | `createFaviconIcon()`: White bg, favicon at 70% size |
| `src/components/MyShortcutsContent.tsx` | Add white/neutral container background, match sizing |
| `src/components/IconPicker.tsx` | Same container styling for preview consistency |

## Visual Result

| Location | Platform Icons | Favicons |
|----------|---------------|----------|
| Android Home Screen | Branded logo (YouTube red play icon) on white adaptive mask | Favicon on white adaptive mask |
| IconPicker Preview | Branded logo on white/neutral container | Favicon on white/neutral container |
| My Shortcuts List | Branded logo on white/neutral container | Favicon on white/neutral container |

## Important Notes

1. **Adaptive Icons**: Android's adaptive icon system will still apply the launcher's mask shape (circle, squircle, etc.) to the white background
2. **Brand Recognition**: Icons like YouTube will show the full red+white logo instead of just a white play button
3. **Favicon Quality**: Some favicons may appear small - the 70% scaling ensures they're visible but not stretched

