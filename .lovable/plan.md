
Goal: Fix the native Android PDF viewer so pages render actual content (not blank white bitmaps) and the page indicator reliably appears.

What I believe is happening (most likely root cause)
- In `NativePdfViewerActivity.renderPageAsync()` the low‑res bitmap is created with `Bitmap.Config.RGB_565`:
  - `Bitmap lowBitmap = Bitmap.createBitmap(lowWidth, lowHeight, Bitmap.Config.RGB_565);`
- Android’s official `PdfRenderer.Page.render()` documentation states: “The destination bitmap format must be ARGB.”
- On many devices/Android versions, rendering into `RGB_565` can result in:
  - a thrown `IllegalArgumentException` (caught and only logged), or
  - a “successful” render that draws nothing (so you keep the white bitmap).
- Because the viewer relies on the low-res pass to “show something instantly”, if that pass never produces real pixels, you’ll see scrollable blank pages.

Secondary issue (why page number appears “missing”)
- The page indicator is inside `topBar`, which auto-hides after 3 seconds.
- If the user doesn’t know to single-tap to show it again, it will look like “no page number”.
- Also, `updatePageIndicator()` is called immediately during setup, but can be a no-op before the first layout pass (first visible position can be `-1`). It should be posted after layout to guarantee it populates.

Scope constraints respected
- No rewrites of the whole viewer architecture.
- Keep PdfRenderer + RecyclerView + low→high “swap” strategy.
- Focus on targeted fixes for rendering correctness and visibility of the indicator.

Implementation plan (code changes)
1) Fix the bitmap format used for PdfRenderer (critical)
   - In `native/android/app/src/main/java/app/onetap/shortcuts/NativePdfViewerActivity.java`:
     - Change low-res bitmap config from `RGB_565` to `ARGB_8888`.
       - This aligns with the PdfRenderer contract (“bitmap format must be ARGB”) and should immediately stop blank pages.
     - Keep low-res dimensions small (you already do via `LOW_RES_SCALE = 0.5f`), so memory impact stays reasonable.
   - Optional refinement (if memory becomes an issue):
     - Reduce `LOW_RES_SCALE` to 0.35–0.4 (still fast preview, less memory).
     - Keep high-res as ARGB_8888 (already is).

2) Make rendering failures visible and diagnosable (so we don’t “silently” fail again)
   - Add stronger logging around the render calls:
     - Log pageIndex, bitmap w/h/config, and URI scheme.
     - Log full exception stack trace (not only `e.getMessage()`).
   - Add a lightweight “render failed” fallback per page:
     - If low-res render fails, attempt a high-res render directly once for that page (still on background thread).
     - If that also fails, show a clear placeholder state (e.g., a gray page with “Could not render page” text) instead of a misleading blank white page.
   - This ensures we don’t get stuck with white bitmaps that look like “render succeeded”.

3) Make page indicator reliable (so it appears when scrolling and right after opening)
   - Post an initial indicator update after the RecyclerView first layout:
     - `recyclerView.post(this::updatePageIndicator);`
   - Keep current behavior (single tap toggles top bar), but reduce confusion:
     - Increase `AUTO_HIDE_DELAY_MS` for the first open (e.g., don’t auto-hide until first successful render, or increase to ~6–8 seconds).
     - This keeps the UI minimal but makes “page number exists” obvious.

4) Small correctness / cleanup items (low risk)
   - Remove unused `Matrix` import in `NativePdfViewerActivity.java` if it’s no longer used.
   - Ensure placeholder background resets to white when a bitmap is set (right now placeholder sets a gray background and it may persist).

Testing plan (Android)
A. Quick sanity checks
- Open a known simple PDF (1–5 pages) from:
  1) a local file manager (“Open with OneTap”)
  2) a shortcut-based PDF open (home screen shortcut)
- Confirm:
  - Text/graphics render on page 1 within ~1s (low-res)
  - After a moment, page sharpens (high-res swap)
  - No blank white pages during scroll

B. Page indicator behavior
- Confirm indicator shows “1 / N” after open (without needing to scroll).
- Scroll: indicator updates.
- Wait: top bar hides; single tap shows it again.

C. Edge PDFs
- Test a larger PDF (50+ pages) for memory stability.
- Test a PDF from Google Drive / cloud provider (content:// URIs).
- If any still render blank, the new logs + fallback will tell us exactly why.

Capacitor/native workflow reminder (so the fix actually reaches Android)
- After you pull the changes locally:
  1) `npm install`
  2) `npm run build`
  3) `npx cap sync android`
  4) `node scripts/android/patch-android-project.mjs`
  5) `npx cap run android`

Acceptance criteria
- Pages render visible content (not blank) on at least 2 different PDFs.
- No recurring “white-only” output when scrolling.
- Page indicator appears reliably and updates with scroll (and is discoverable despite auto-hide).

Files involved
- Primary: `native/android/app/src/main/java/app/onetap/shortcuts/NativePdfViewerActivity.java`
- No changes required to proxy/launch activities unless logs indicate a URI/permission edge case.

If this does not fully resolve it (contingency)
- If ARGB_8888 low-res still produces blank output, the next likely cause is URI/provider incompatibility (non-seekable streams). In that case, the plan is:
  - Copy the PDF to an internal temporary file (from the content URI) and open PdfRenderer from that local file descriptor.
  - This is a standard approach for Drive/DocumentProviders that don’t behave like normal files.
  - I’ll only do this if logs indicate it’s necessary, because it’s a bigger behavioral change (but still contained).
