

# Fix: Pinch-to-Zoom Not Working (Touch Event Handling)

## Problem Analysis

The pinch-to-zoom gesture is not working while double-tap zoom works correctly. After analyzing the code, I've identified the root cause:

### Root Cause

The touch event handling in `setupGestureDetectors()` has a critical issue:

```java
// Line 764-768
recyclerView.setOnTouchListener((v, event) -> {
    scaleGestureDetector.onTouchEvent(event);
    gestureDetector.onTouchEvent(event);
    return false; // ← PROBLEM: Not consuming touch events!
});
```

**Why this breaks pinch zoom:**

1. When `return false` is used, the view signals it did NOT handle the event
2. The parent view (or RecyclerView's internal scroll handling) then takes over
3. Multi-touch gestures like pinch require the **entire event sequence** to be consumed by the same handler
4. When RecyclerView's scroll intercepts the gesture, `ACTION_POINTER_DOWN` (second finger) and subsequent `ACTION_MOVE` events may not reach the `ScaleGestureDetector`
5. Double-tap works because it's a single-finger gesture that doesn't conflict with scroll

### Supporting Evidence

- `onInterceptTouchEvent()` only intercepts when `zoomLevel > 1.0f && pointerCount == 1`
- This means at 1.0x zoom, multi-pointer events (pinch) are NOT intercepted
- RecyclerView's vertical scroll handling consumes the events instead

## Solution

### 1. Fix Touch Listener Return Value

The touch listener must return `true` when handling scale gestures:

```java
recyclerView.setOnTouchListener((v, event) -> {
    // Always pass events to gesture detectors
    boolean scaleHandled = scaleGestureDetector.onTouchEvent(event);
    gestureDetector.onTouchEvent(event);
    
    // Consume event if scaling is in progress, or if it's a multi-touch gesture
    // This prevents RecyclerView scroll from interfering with pinch-to-zoom
    if (scaleGestureDetector.isInProgress() || event.getPointerCount() > 1) {
        return true;
    }
    
    return false; // Allow normal scroll for single-touch
});
```

### 2. Update `onInterceptTouchEvent` for Multi-Touch

Ensure multi-pointer events are properly handled during zoom gestures:

```java
@Override
public boolean onInterceptTouchEvent(MotionEvent e) {
    // Don't intercept multi-touch events - let them reach the touch listener for scale detection
    if (e.getPointerCount() > 1) {
        return false;
    }
    
    // Intercept single-touch for horizontal panning when zoomed
    if (zoomLevel > 1.0f && e.getPointerCount() == 1) {
        return true;
    }
    
    return super.onInterceptTouchEvent(e);
}
```

### 3. Add `requestDisallowInterceptTouchEvent` During Scaling

To prevent the parent view hierarchy from stealing touch events during a pinch gesture:

```java
@Override
public boolean onScaleBegin(ScaleGestureDetector detector) {
    isScaling = true;
    // Prevent parent from intercepting touch during scale gesture
    recyclerView.getParent().requestDisallowInterceptTouchEvent(true);
    startZoom = recyclerView.getZoomLevel();
    recyclerView.beginZoomGesture(detector.getFocusX(), detector.getFocusY());
    return true;
}

@Override
public void onScaleEnd(ScaleGestureDetector detector) {
    isScaling = false;
    // Allow parent to intercept again
    recyclerView.getParent().requestDisallowInterceptTouchEvent(false);
    // ... rest of existing code
}
```

### 4. Handle `ACTION_POINTER_DOWN` Explicitly

When a second finger touches down, immediately signal that we might be scaling:

```java
recyclerView.setOnTouchListener((v, event) -> {
    int action = event.getActionMasked();
    
    // When second finger comes down, prepare for potential scale gesture
    if (action == MotionEvent.ACTION_POINTER_DOWN && event.getPointerCount() == 2) {
        v.getParent().requestDisallowInterceptTouchEvent(true);
    }
    
    boolean scaleHandled = scaleGestureDetector.onTouchEvent(event);
    gestureDetector.onTouchEvent(event);
    
    // Consume if scaling or multi-touch
    if (scaleGestureDetector.isInProgress() || event.getPointerCount() > 1) {
        return true;
    }
    
    // Release scroll lock when back to single touch
    if (action == MotionEvent.ACTION_POINTER_UP && event.getPointerCount() <= 2) {
        v.getParent().requestDisallowInterceptTouchEvent(false);
    }
    
    return false;
});
```

## Technical Changes

### File: `NativePdfViewerActivity.java`

| Section | Change |
|---------|--------|
| Lines 213-220 (`onInterceptTouchEvent`) | Add check to NOT intercept multi-pointer events |
| Lines 764-768 (`setOnTouchListener`) | Return `true` when `isInProgress()` or multi-touch, add `requestDisallowInterceptTouchEvent()` |
| Lines 686-691 (`onScaleBegin`) | Add `requestDisallowInterceptTouchEvent(true)` |
| Lines 720-731 (`onScaleEnd`) | Add `requestDisallowInterceptTouchEvent(false)` |

## Expected Behavior After Fix

| Gesture | Before | After |
|---------|--------|-------|
| Pinch zoom in | Not working | Works smoothly |
| Pinch zoom out | Not working | Works to 0.2x (5 pages) |
| Double-tap zoom | Works | Works (unchanged) |
| Vertical scroll | Works | Works (unchanged) |
| Horizontal pan (zoomed) | Works | Works (unchanged) |

## Why Double-Tap Works But Pinch Doesn't

Double-tap is detected via `GestureDetector.onDoubleTap()`, which:
- Uses single-finger taps
- Doesn't conflict with RecyclerView's scroll
- The timing-based detection works even with `return false`

Pinch-to-zoom requires:
- `ACTION_POINTER_DOWN` (second finger)
- Continuous `ACTION_MOVE` with 2 pointers
- `ACTION_POINTER_UP` (finger lift)

When `return false`, RecyclerView interprets the initial touch as scroll attempt and may never let the second finger's events reach the gesture detector.

## Testing Checklist

- [ ] Pinch zoom in works at any zoom level
- [ ] Pinch zoom out works to 0.2x minimum
- [ ] Pinch gesture starts immediately (no delay)
- [ ] Vertical scroll still works with single finger
- [ ] Double-tap zoom still works
- [ ] Horizontal pan works when zoomed in
- [ ] No scroll jitter during pinch

