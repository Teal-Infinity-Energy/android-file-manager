

# Native PDF Viewer: Architectural Decision

## Executive Summary

**Recommendation: Build a minimal native Android PDF viewer using `PdfRenderer` + `RecyclerView`.**

The current web-based implementation (PDF.js + canvas) is fundamentally incapable of matching Google Drive's perceptual quality. The 250ms blurry-to-sharp re-render on zoom is an architectural limitation of web rendering, not a bug that can be patched.

---

## 1. Architectural Evaluation

### Option A: Web-Based (Current Implementation)

| Aspect | Reality |
|--------|---------|
| **Zoom smoothness** | CSS scale is instant, but canvas re-render requires full redraw after debounce |
| **Blurry-to-sharp** | Unavoidable—CSS scaling blurs pixels, re-render sharpens them |
| **Scroll continuity** | Reasonable with intersection observer lazy loading |
| **Physical feel** | Fundamentally limited by JS thread execution and canvas painting |

**Verdict: Ceiling reached.** No amount of optimization eliminates the visible re-render moment. The 250ms debounce exists because rendering is expensive—reducing it to 150ms just makes the blur duration shorter, not invisible.

### Option B: Hybrid (WebView + Native Tiles)

Attempting to tile-render in native and composite in WebView creates extreme complexity with cross-boundary communication, texture synchronization, and lifecycle management.

**Verdict: Complexity explosion with marginal benefit.**

### Option C: Fully Native PDF Viewer (Recommended)

Android's `PdfRenderer` API provides hardware-accelerated bitmap rendering directly to native views. Combined with a `RecyclerView` for virtualized scrolling and `PhotoView`/matrix transformations for zoom, this can achieve Drive-level smoothness.

**Why this works:**
- Bitmap rendering happens on GPU with hardware acceleration
- Pinch-to-zoom uses matrix transformations (no re-render during gesture)
- High-DPI re-render happens on background thread, composites instantly
- Native scroll uses platform physics (momentum, edge effects)

**Verdict: Only architecture that can meet the bar.**

---

## 2. Minimum Viable Native Reader

### Required Features (Exhaustive)

| Feature | Justification |
|---------|---------------|
| Vertical scrolling | Core reading interaction |
| Pinch-to-zoom with focal anchoring | Readability for small text |
| Double-tap to toggle fit/zoom | Quick zoom access |
| Resume position | "One tap to where you left off" |
| Close button | Exit to return to app |

### Explicitly Excluded

| Feature | Why |
|---------|-----|
| Search | Implies workspace, not quick access |
| Annotations | Editing scope, not reading scope |
| Thumbnails/outline | Navigation beyond simple reading |
| Reading modes (sepia, dark) | Remove from current web viewer too |
| Page number overlays | Visual noise (current viewer has these) |
| Share button | Already available via shortcut action sheet |

### Scope Guard

The native viewer should be ~400-600 lines of Java, modeled after `NativeVideoPlayerActivity` but drastically simpler. If it grows beyond 800 lines, scope has crept.

---

## 3. Zoom & Scroll Quality Acceptance Criteria

### Pinch-to-Zoom

- **Continuous scaling**: Visual scale must update every frame during pinch (no stepped increments)
- **No blur state**: Current resolution is displayed until gesture ends; new resolution composites atomically
- **Focal anchoring**: The exact pixel under the pinch center must remain under the pinch center throughout gesture
- **No latency**: Scale change must be visible within 16ms of touch input

### Scroll

- **Native momentum**: Must use platform scroll physics (fling deceleration, edge glow)
- **No page gaps**: Pages must flow continuously (continuous scroll, not pagination)
- **Pre-rendered adjacent pages**: At least 1 page above and below viewport must be ready

### Resume

- **Pixel-accurate**: Scroll position restored within ~50px of where user left off
- **Zoom preserved**: Last zoom level restored exactly

### Trust Metric

> If a user pinches to zoom, reads a sentence, and pinches back out—this cycle must feel as smooth as Google Drive or Apple Preview. Any visible rendering moment fails the bar.

---

## 4. Ideology Alignment

### "One tap to what matters"

- Native viewer loads directly from shortcut tap (no intermediate screens)
- No splash, no loading modal—content appears instantly or with skeleton

### Distraction-free

- UI auto-hides after 3 seconds (like video player)
- Only close button visible when controls shown
- No reading mode toggles, search, or page counters

### Step aside gracefully

- If user needs annotation/editing, they use a real PDF app
- OneTap viewer is for reading, not managing
- No feature creep—the viewer stays small

### Not competing with PDF apps

The native viewer is philosophically closer to the slideshow viewer than a document editor. It displays content. That's it.

---

## 5. Technical Implementation Outline

### New File: `NativePdfViewerActivity.java`

```text
┌─────────────────────────────────────────────────────┐
│ NativePdfViewerActivity                             │
├─────────────────────────────────────────────────────┤
│ - PdfRenderer (open PDF from URI)                   │
│ - RecyclerView (vertical scroll, page recycling)    │
│ - PhotoView or Matrix-based scaling (pinch zoom)    │
│ - SharedPreferences (resume position storage)       │
│ - Simple close button overlay                       │
└─────────────────────────────────────────────────────┘
```

### Rendering Strategy

1. **Page ViewHolder**: Each page is an ImageView in RecyclerView
2. **Low-res pass**: Render at 0.5x immediately for instant visibility
3. **High-res pass**: Render at 2x device DPI on background thread
4. **Atomic swap**: Replace low-res bitmap with high-res in single frame
5. **Zoom re-render**: Only triggered on gesture end, rendered off-screen, swapped atomically

### Integration with Existing Code

- `PDFProxyActivity.java` routes to `NativePdfViewerActivity` instead of `MainActivity`
- Remove the `/pdf-viewer` web route entirely
- Resume position continues using localStorage key pattern (native SharedPreferences)

---

## 6. Trade-offs Accepted

| Trade-off | Acceptance |
|-----------|------------|
| Two codebases (web fallback removed) | Native-only is acceptable for this core use case |
| No iOS implementation yet | Android first; iOS can follow same pattern |
| Search removed | Aligns with "quick access" ideology—not a loss |
| Reading modes removed | Simplification, not regression |
| Development effort | ~2-3 days for MVP, worth it for core feature |

---

## 7. Hard Decision

**The current web PDF viewer should be deprecated and replaced, not incrementally improved.**

Attempting to optimize the web viewer further is polishing a fundamentally limited architecture. The 250ms blurry-to-sharp moment cannot be eliminated within the constraints of web canvas rendering.

The native video player (`NativeVideoPlayerActivity.java`) proves this app can build premium native experiences. The PDF viewer deserves the same treatment.

---

## 8. Implementation Steps

### Phase 1: Native Viewer Core
1. Create `NativePdfViewerActivity.java` (~400 lines)
2. Implement `PdfRenderer` + `RecyclerView` for vertical scroll
3. Add matrix-based pinch-to-zoom with focal anchoring
4. Add close button overlay with auto-hide

### Phase 2: Resume Integration
5. Save scroll position to SharedPreferences on pause
6. Restore position on activity resume
7. Integrate with shortcut extras for resume toggle

### Phase 3: Routing Cutover
8. Modify `PDFProxyActivity` to launch native viewer directly
9. Remove web `/pdf-viewer` route
10. Remove `src/pages/PDFViewer.tsx` (or keep for web-only fallback)

### Phase 4: Polish
11. Add low-res → high-res atomic render swap
12. Tune scroll physics and pre-render margins
13. Test with 500+ page PDFs for stability

---

## Summary

| Decision | Choice |
|----------|--------|
| Architecture | Fully native Android using `PdfRenderer` |
| Scope | Scroll + zoom + resume only |
| Features removed | Search, reading modes, page overlays |
| Effort | ~2-3 days for MVP |
| Why decisive | Web rendering cannot meet the quality bar; iterating on it is wasted effort |

The PDF viewer is a core feature for book reading. It cannot feel inferior. The native approach is the only path to Drive-level quality.

