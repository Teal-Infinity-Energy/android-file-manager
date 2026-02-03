
# Make Floating Page Badge Dynamic and Auto-Hiding

## Overview

Update the floating page badge in the PDF viewer to:
1. Move vertically based on the current scroll position (aligned with the first visible page)
2. Hide/show together with the top bar header
3. Disable touch events when hidden

## Current Implementation

The page badge is currently:
- Fixed at `Gravity.END | Gravity.CENTER_VERTICAL` (always centered vertically on the right edge)
- Always visible regardless of header state
- Always clickable/touchable

## Implementation Plan

### 1. Make Page Badge Follow Scroll Position

Instead of center-vertical gravity, the badge will be positioned dynamically based on the first visible page's vertical position on screen.

**Changes to `buildUI()`:**
- Change badge gravity from `CENTER_VERTICAL` to `TOP` (we'll control Y position manually)
- Add initial `topMargin` that we'll update dynamically

**Changes to `updatePageIndicator()`:**
- Calculate the vertical center of the first visible page on screen
- Update the badge's `translationY` to align with that page's center

```java
// In updatePageIndicator():
View firstView = layoutManager.findViewByPosition(firstVisible);
if (firstView != null && pageBadge != null) {
    // Get the center Y of the first visible page in screen coordinates
    int[] location = new int[2];
    firstView.getLocationOnScreen(location);
    int pageCenterY = location[1] + (firstView.getHeight() / 2);
    
    // Convert to translation relative to badge's natural position
    int badgeHeight = pageBadge.getHeight();
    int targetY = pageCenterY - (badgeHeight / 2);
    
    // Clamp to screen bounds (below top bar, above bottom)
    int minY = dpToPx(60);  // Below top bar
    int maxY = screenHeight - badgeHeight - dpToPx(16);
    targetY = Math.max(minY, Math.min(maxY, targetY));
    
    pageBadge.setTranslationY(targetY);
}
```

### 2. Sync Page Badge Visibility with Top Bar

**Add badge to `showTopBar()`:**
```java
private void showTopBar() {
    if (topBar != null && !isTopBarVisible) {
        isTopBarVisible = true;
        topBar.animate()
            .alpha(1f)
            .translationY(0)
            .setDuration(200)
            .withStartAction(() -> topBar.setVisibility(View.VISIBLE))
            .start();
        
        // Show page badge with same animation
        if (pageBadge != null) {
            pageBadge.setClickable(true);
            pageBadge.animate()
                .alpha(1f)
                .translationX(0)  // Slide in from right
                .setDuration(200)
                .start();
        }
        
        scheduleHide();
    }
    // ... rest of method
}
```

**Add badge to `hideTopBar()`:**
```java
private void hideTopBar() {
    if (topBar != null && isTopBarVisible) {
        isTopBarVisible = false;
        hideHandler.removeCallbacks(hideRunnable);
        topBar.animate()
            .alpha(0f)
            .translationY(-topBar.getHeight())
            .setDuration(200)
            .start();
        
        // Hide page badge with slide-out animation
        if (pageBadge != null) {
            pageBadge.setClickable(false);
            pageBadge.animate()
                .alpha(0f)
                .translationX(dpToPx(50))  // Slide out to right
                .setDuration(200)
                .start();
        }
    }
}
```

### 3. Disable Touch Events When Hidden

The `setClickable(false)` in `hideTopBar()` and `setClickable(true)` in `showTopBar()` will handle this. Additionally, we should set the badge as non-focusable when hidden:

```java
// In hideTopBar():
if (pageBadge != null) {
    pageBadge.setClickable(false);
    pageBadge.setEnabled(false);
    // ... animation
}

// In showTopBar():
if (pageBadge != null) {
    pageBadge.setClickable(true);
    pageBadge.setEnabled(true);
    // ... animation
}
```

### 4. Update Initial Badge Setup

**Changes to `buildUI()`:**
```java
// Floating page badge - use TOP gravity for manual Y positioning
FrameLayout.LayoutParams badgeParams = new FrameLayout.LayoutParams(
    ViewGroup.LayoutParams.WRAP_CONTENT,
    ViewGroup.LayoutParams.WRAP_CONTENT
);
badgeParams.gravity = Gravity.END | Gravity.TOP;
badgeParams.setMarginEnd(dpToPx(16));
badgeParams.topMargin = dpToPx(60);  // Initial position below top bar
pageBadge.setLayoutParams(badgeParams);
```

## Files to Modify

| File | Changes |
|------|---------|
| `NativePdfViewerActivity.java` | Update badge layout params, add dynamic Y positioning in `updatePageIndicator()`, sync show/hide with top bar |

## Visual Behavior

| Action | Badge Behavior |
|--------|----------------|
| Scroll down | Badge hides (slides right + fades), becomes non-interactive |
| Scroll up | Badge shows (slides left + fades in), becomes interactive |
| Single tap | Badge toggles visibility with header |
| Page scroll | Badge moves vertically to align with first visible page center |
| Idle timeout | Badge hides after 4 seconds with header |

## Testing Checklist

- [ ] Badge moves vertically as user scrolls through pages
- [ ] Badge stays aligned with the center of the first visible page
- [ ] Badge hides when scrolling down (with header)
- [ ] Badge shows when scrolling up (with header)
- [ ] Badge is not clickable when hidden
- [ ] Badge slide-in/out animation is smooth
- [ ] Badge position is clamped to avoid going behind top bar or off-screen
- [ ] Single tap toggles both header and badge together
