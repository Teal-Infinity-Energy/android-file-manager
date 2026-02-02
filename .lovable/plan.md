
# Full-Quality Slideshow Images with EXIF Rotation Fix

## Problem Summary

1. **Low quality images**: Viewer shows 256px thumbnails instead of full-resolution originals
2. **Rotated images**: Photos appear rotated 90° counter-clockwise because EXIF orientation isn't applied
3. **Content URI handling**: Android `content://` URIs need conversion for WebView display

---

## Solution Overview

### Part 1: Web Layer - Use Full-Quality Images

Modify `SlideshowViewer.tsx` to:
- Prioritize original `content://` URIs over thumbnails
- Convert URIs using `Capacitor.convertFileSrc()` for WebView compatibility
- Keep thumbnails as fallback only if original fails to load

### Part 2: Native Layer - Fix EXIF Rotation in Thumbnails

Update `ShortcutPlugin.java` to read EXIF orientation and rotate bitmaps accordingly:
- Use `ExifInterface` to read orientation from image metadata
- Apply rotation matrix before generating thumbnail
- This fixes both the viewer (when using thumbnails as fallback) and the grid icon

---

## Technical Implementation

### File 1: `src/pages/SlideshowViewer.tsx`

**Changes:**
1. Add state for resolved/converted image URLs
2. Convert `content://` URIs to WebView-accessible URLs
3. Prioritize full-quality images, fallback to thumbnails on error
4. Add loading state per image

```typescript
// Add new state
const [convertedUrls, setConvertedUrls] = useState<Map<number, string>>(new Map());
const [loadingStates, setLoadingStates] = useState<Map<number, 'loading' | 'ready' | 'error'>>(new Map());

// Effect to convert URIs when images change
useEffect(() => {
  if (!Capacitor.isNativePlatform() || images.length === 0) return;
  
  // Convert content:// URIs to WebView-accessible URLs
  images.forEach((uri, index) => {
    if (uri.startsWith('content://') || uri.startsWith('file://')) {
      const converted = Capacitor.convertFileSrc(uri);
      setConvertedUrls(prev => new Map(prev).set(index, converted));
    }
  });
}, [images]);

// Get image source with proper fallback chain
const getImageSource = (index: number): string => {
  // Priority 1: Converted full-quality URI
  const converted = convertedUrls.get(index);
  if (converted) return converted;
  
  // Priority 2: Original URI (for web or HTTP sources)
  const original = images[index];
  if (original?.startsWith('http')) return original;
  
  // Priority 3: Thumbnail as fallback
  const thumbnail = thumbnails[index];
  if (thumbnail) {
    return thumbnail.startsWith('data:') 
      ? thumbnail 
      : `data:image/jpeg;base64,${thumbnail}`;
  }
  
  return '';
};
```

---

### File 2: `native/.../plugins/ShortcutPlugin.java`

**Add import:**
```java
import androidx.exifinterface.media.ExifInterface;
```

**Update `generateImageThumbnailBase64` method to handle EXIF rotation:**

```java
private String generateImageThumbnailBase64(Context context, Uri uri, int maxSize) {
    try {
        // Read EXIF orientation BEFORE decoding bitmap
        int rotation = getExifRotation(context, uri);
        
        InputStream inputStream = context.getContentResolver().openInputStream(uri);
        if (inputStream == null) return null;

        // ... existing decode logic ...
        
        Bitmap bitmap = BitmapFactory.decodeStream(inputStream, null, options);
        inputStream.close();
        
        if (bitmap == null) return null;

        // Apply EXIF rotation if needed
        if (rotation != 0) {
            Matrix matrix = new Matrix();
            matrix.postRotate(rotation);
            bitmap = Bitmap.createBitmap(bitmap, 0, 0, 
                bitmap.getWidth(), bitmap.getHeight(), matrix, true);
        }

        // ... existing scale and encode logic ...
    } catch (Exception e) {
        // ...
    }
}

/**
 * Read EXIF orientation from image URI and return rotation degrees.
 */
private int getExifRotation(Context context, Uri uri) {
    try {
        InputStream input = context.getContentResolver().openInputStream(uri);
        if (input == null) return 0;
        
        ExifInterface exif = new ExifInterface(input);
        int orientation = exif.getAttributeInt(
            ExifInterface.TAG_ORIENTATION, 
            ExifInterface.ORIENTATION_NORMAL
        );
        input.close();
        
        switch (orientation) {
            case ExifInterface.ORIENTATION_ROTATE_90:
                return 90;
            case ExifInterface.ORIENTATION_ROTATE_180:
                return 180;
            case ExifInterface.ORIENTATION_ROTATE_270:
                return 270;
            default:
                return 0;
        }
    } catch (Exception e) {
        android.util.Log.w("ShortcutPlugin", "Could not read EXIF: " + e.getMessage());
        return 0;
    }
}
```

---

### File 3: `native/android/app/build.gradle` (if not already present)

Add ExifInterface dependency:
```gradle
implementation 'androidx.exifinterface:exifinterface:1.3.6'
```

---

### File 4: Android Patch File Update

Add the EXIF rotation fix to the patch script for consistent rebuilds.

---

## Image Loading Flow

```text
User opens slideshow
        │
        ▼
┌─────────────────────────┐
│ Load shortcut data      │
│ - imageUris (content://)│
│ - imageThumbnails       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Convert content:// URIs │
│ via convertFileSrc()    │
│ → http://localhost/...  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Display full-quality    │
│ If fails → thumbnail    │
└─────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/SlideshowViewer.tsx` | Use converted URIs, add fallback loading, prioritize full quality |
| `native/.../ShortcutPlugin.java` | Add EXIF rotation to thumbnail generation |
| `native/android/app/build.gradle` | Add exifinterface dependency (if missing) |
| `scripts/android/patch-android-project.mjs` | Include EXIF rotation in patch |

---

## Edge Cases Handled

1. **Web platform**: Falls back to thumbnails (no content:// on web)
2. **HTTP URLs**: Passed through without conversion
3. **Missing thumbnails**: Shows loading state, then error placeholder
4. **EXIF orientation values**: Handles 90°, 180°, 270° rotations
5. **No EXIF data**: Defaults to 0° rotation (no change)

---

## Testing Checklist

- [ ] Open slideshow with photos taken in portrait mode → should display upright
- [ ] Open slideshow with photos taken in landscape mode → should display correctly
- [ ] Verify images are full resolution (not pixelated 256px thumbnails)
- [ ] Test swipe navigation maintains quality
- [ ] Verify "Open with..." still works with original URI
- [ ] Create new slideshow → grid icon should show correctly rotated thumbnails
