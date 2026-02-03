

# PDF Page Centering & Panning Enhancement

## Overview

Ensure PDF pages stay horizontally centered when their scaled width is less than the screen width (in both portrait and landscape), and enable smooth one-finger movement in all directions when the zoomed page exceeds screen bounds.

---

## Current Behavior

| Scenario | Current Behavior |
|----------|-----------------|
| Zoomed out (< 1.0x) | Pages are centered horizontally via `Gravity.CENTER_HORIZONTAL` ✓ |
| At 1.0x | Pages fill screen width, no centering needed ✓ |
| Zoomed in (> 1.0x) | Canvas scales content, horizontal panning available |
| Orientation change | `screenWidth` not updated - pages may not recenter |
| Vertical panning when zoomed | Not available - RecyclerView handles scroll |

---

## Problem Areas

### 1. Orientation Changes Not Handled
The `screenWidth` and `screenHeight` are set only in `onCreate()`. When device rotates:
- Pages may use stale dimensions
- Centering calculations become incorrect
- Page scaling doesn't adapt to new screen width

### 2. Pan Direction Limited
Current panning only allows horizontal movement when zoomed in (> 1.0x):
```java
if (zoomLevel > 1.0f) {
    // Only horizontal pan via panX
}
```
Users expect smooth one-finger movement in all directions when content exceeds screen bounds.

### 3. Centering Logic Needs Refinement
When a page's scaled width is less than screen width (even when zoomed in), pages should remain centered rather than being pannable.

---

## Implementation Plan

### 1. Handle Orientation Changes

Update screen dimensions when configuration changes:

```java
@Override
public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    
    // Update screen dimensions
    DisplayMetrics metrics = getResources().getDisplayMetrics();
    screenWidth = metrics.widthPixels;
    screenHeight = metrics.heightPixels;
    
    // Reset pan to recenter
    if (recyclerView != null) {
        recyclerView.resetPan();
        recyclerView.invalidate();
    }
    
    // Trigger adapter rebind for new dimensions
    if (adapter != null) {
        adapter.notifyDataSetChanged();
    }
}
```

Add to `AndroidManifest.xml`:
```xml
android:configChanges="orientation|screenSize|smallestScreenSize|screenLayout"
```

### 2. Improve Pan Logic in ZoomableRecyclerView

Replace horizontal-only panning with bidirectional movement:

```java
private float panX = 0f;
private float panY = 0f;  // NEW: Add vertical pan offset
private float lastTouchX = 0f;
private float lastTouchY = 0f;  // NEW: Track Y position

// In onTouchEvent():
case MotionEvent.ACTION_MOVE:
    if (e.getPointerCount() == 1 && !isInternalScaling) {
        float dx = e.getX() - lastTouchX;
        float dy = e.getY() - lastTouchY;
        
        // Calculate content bounds
        float scaledContentWidth = getWidth() * zoomLevel;
        float scaledContentHeight = getTotalContentHeight() * zoomLevel;
        
        // Allow horizontal pan only if content wider than screen
        if (scaledContentWidth > getWidth()) {
            if (Math.abs(dx) > 5) isPanning = true;
            if (isPanning) {
                panX = clampPanX(panX + dx);
            }
        }
        
        // Allow vertical pan only if content taller than screen
        // (Otherwise RecyclerView handles vertical scroll)
        if (scaledContentHeight > getHeight() && zoomLevel > 1.0f) {
            if (Math.abs(dy) > 5) isPanning = true;
            if (isPanning) {
                panY = clampPanY(panY + dy);
            }
        }
        
        lastTouchX = e.getX();
        lastTouchY = e.getY();
        invalidate();
    }
    break;
```

### 3. Update dispatchDraw for Combined Transform

Modify canvas transform to include vertical pan:

```java
@Override
protected void dispatchDraw(Canvas canvas) {
    canvas.save();
    
    if (zoomLevel < 1.0f) {
        // ZOOMED OUT: No canvas transform - layout heights handle sizing
        // Pages are centered via Gravity.CENTER_HORIZONTAL in adapter
    } else if (zoomLevel > 1.0f) {
        // ZOOMED IN: Pan + scale from focal point
        // Check if content width exceeds screen before applying horizontal pan
        float scaledContentWidth = getWidth() * zoomLevel;
        float effectivePanX = (scaledContentWidth > getWidth()) ? panX : 0;
        
        canvas.translate(effectivePanX, panY);
        canvas.scale(zoomLevel, zoomLevel, focalX, focalY);
    }
    // At 1.0x: No transformation needed
    
    super.dispatchDraw(canvas);
    canvas.restore();
}
```

### 4. Smart Centering with Pan Clamping

Update `clampPan()` to handle both directions and auto-center when content fits:

```java
private void clampPan() {
    // Calculate scaled content dimensions
    float scaledContentWidth = getWidth() * zoomLevel;
    
    // Horizontal: If content fits, center it (panX = 0)
    // If content exceeds, allow panning within bounds
    if (scaledContentWidth <= getWidth()) {
        panX = 0;  // Center content
    } else {
        float maxPanX = (scaledContentWidth - getWidth()) / 2;
        panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    }
    
    // Vertical pan clamping (for zoomed-in mode)
    if (zoomLevel <= 1.0f) {
        panY = 0;  // No vertical pan when zoomed out/at 1.0x
    } else {
        // Clamp vertical pan based on content height
        float visibleContentHeight = getHeight();
        float scaledVisibleHeight = visibleContentHeight * zoomLevel;
        float maxPanY = Math.max(0, (scaledVisibleHeight - visibleContentHeight) / 2);
        panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
    }
}
```

### 5. Update Zoom Animation to Reset Pan

In `animateZoomTo()`, animate pan to 0 when zooming to 1.0x or below:

```java
final float targetPanX = (targetZoom <= 1.0f) ? 0 : panX;
final float targetPanY = (targetZoom <= 1.0f) ? 0 : panY;
```

---

## Technical Details

### Content Width Calculation
At any zoom level, the effective content width is:
- For individual pages: `pageWidth * (screenWidth / originalPageWidth) * zoomLevel`
- For the viewport: `screenWidth * zoomLevel`

When `screenWidth * zoomLevel <= screenWidth` (i.e., `zoomLevel <= 1.0`), pages are centered via the adapter's `Gravity.CENTER_HORIZONTAL`.

### RecyclerView Integration
Vertical scrolling through the RecyclerView should continue to work normally:
- When `zoomLevel <= 1.0`: RecyclerView handles all vertical scroll
- When `zoomLevel > 1.0`: `panY` handles initial vertical offset within the visible area, then RecyclerView takes over for scrolling between pages

### Gesture Conflict Resolution
The touch handling priority:
1. Scale gesture (two fingers) - highest priority
2. Pan gesture (one finger, content exceeds screen)
3. RecyclerView scroll (one finger, vertical navigation)

---

## Files to Modify

| File | Changes |
|------|---------|
| `NativePdfViewerActivity.java` | Add `panY` field, update touch handling, modify `dispatchDraw()`, update `clampPan()`, handle config changes |
| `AndroidManifest.xml` | Add `configChanges` to prevent activity restart on rotation |

---

## Testing Checklist

- [ ] Portrait: Pages centered when zoomed out (< 1.0x)
- [ ] Landscape: Pages centered when zoomed out (< 1.0x)
- [ ] Rotate device: Pages recenter correctly
- [ ] Zoom to 2.5x: Can pan left/right when page exceeds width
- [ ] Zoom to 2.5x: Can pan up/down smoothly
- [ ] One-finger movement: Smooth in all directions when zoomed
- [ ] At 1.0x zoom: Pages fill width, no horizontal pan
- [ ] Double-tap zoom: Pan resets to center when zooming out

