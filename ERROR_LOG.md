# Error Log

Use this file to track frontend issues, app issues, asset regressions, task-execution failures, root causes, fixes, and validation.
Add new entries at the top so the most recent incidents stay visible.
Before starting work on a bug or incident, review the lessons in relevant past entries.
Keep product issues and task-execution failures in this same chronological log so future harnesses can correlate user-visible regressions with tooling, validation, and process failures.

## Entry Template

### YYYY-MM-DD - Short Title

- Status: Open | Monitoring | Resolved
- Area: UI | State | Auth | Networking | Sync | Navigation | Build | Deployment | Assets | Tooling | Validation | Task Execution
- Symptoms:
- Root cause:
- Solution implemented:
- Validation:
- Lessons learned:
- Notes:

## Incident Writing Standard

Use short, concrete bullets.
Write what happened, why it happened, what changed, how it was verified, and what the team should remember next time.
Log meaningful task-execution failures even if the final feature or fix succeeds; the lesson is still useful if it changed the execution path or could recur.

---

### 2026-06-16 - Thick reference lettermark extraction briefly reused source shading

- Status: Resolved
- Area: Assets / Task Execution / Validation
- Symptoms: Updating the logo to match a thicker white reference initially failed because the generator still referenced the old `SOURCE` constant. After that was fixed, the first generated gold mark inherited the reference image's white/gray shading as alpha, making the gold look uneven and disconnected from the approved gold-gradient treatment.
- Root cause: `scripts/generate_logo_assets.py` had been refactored from the old adaptive-icon source to a copied reference image, but `main()` still loaded the removed constant. The first reference extraction treated brightness as opacity, so source lighting affected the final gold treatment instead of only the silhouette.
- Solution implemented: Copied the supplied reference into `assets/teleba-logo-thick-reference.png`, updated the generator to extract the thicker silhouette from that file, fixed `main()` to load the reference extractor, tightened the mask so the reference controls shape only, and restored a controlled gold gradient in `polish_lettermark()`.
- Validation: Ran `python .\scripts\generate_logo_assets.py` until it completed successfully with zero contamination and surface outliers, including `adaptiveSourceContamination=0`, `resizedForegroundRed=0`, `flat16ForegroundPixels=48`, and `flat32ForegroundPixels=231`. Visually reviewed the regenerated app icon, adaptive icon, favicon, and mirrored Teleba logo mark with the restored gradient. Ran `npx tsc --noEmit` in `Zesha-App` and `npm run build` in `teleba` successfully.
- Lessons learned: When a user supplies a shaded logo reference for a silhouette change, extract a binary/high-confidence mask from the reference and apply the approved gold treatment separately. A gradient can be correct when it is generated from brand colors and coordinates; it should not come from the source reference's white/silver lighting. After changing generator source constants, immediately run the generator to catch stale wiring before polishing visuals.
- Notes: A validation attempt with `.\.venv\Scripts\python.exe` failed because `Zesha-App` does not have that local interpreter path; rerunning with `python .\scripts\generate_logo_assets.py` passed. Full TypeScript and Teleba build validation were run after the asset and documentation updates.

### 2026-06-10 - Lettermark surface color consistency was not validated

- Status: Resolved
- Area: Assets / Validation
- Symptoms: Close visual inspection of the metallic TB/T3 lettermark showed uneven color along the gold surface. Existing generator checks caught red contamination, dark edge matte, alpha scratches, and small-size favicon visibility, but did not measure abrupt color outliers inside the opaque gold letter surfaces. The first surface test covered the cleaned source mark but did not check each final generated metallic output after resize/composition.
- Root cause: `scripts/generate_logo_assets.py` had no local-neighborhood surface consistency test for the lettermark itself. The first repair attempt used independent channel medians and briefly synthesized red-like contamination, showing that repairs must choose real neighboring foreground pixels. A follow-up check found the rich resized foreground could introduce a visible surface cluster even when the cleaned source foreground passed.
- Solution implemented:
  - Added `collect_lettermark_surface_outliers()` to scan opaque interior lettermark pixels and compare each pixel to its local opaque neighborhood.
  - Added `repair_lettermark_surface_outliers()` to repair visible surface-defect clusters using actual nearby foreground pixels, preserving the approved silhouette and metallic shading.
  - Added generator output metrics for `lettermarkSurfaceOutliersBefore`, `lettermarkSurfaceOutliersAfter`, `largestCluster`, and `bbox`.
  - Added a second rich-lettermark repair after resizing and named `surfaceTarget=...` checks for each generated metallic-lettermark output.
  - Added a generation failure condition for excessive outliers or connected surface clusters larger than the accepted isolated-pixel limit.
- Validation:
  - Initial probe found `510` surface outliers with a `201` pixel connected cluster.
  - Final generator run completed successfully with `lettermarkSurfaceOutliersBefore=16`, `lettermarkSurfaceOutliersAfter=16`, `largestCluster=4`, `richLettermarkSurfaceOutliersBefore=168`, `richLettermarkSurfaceOutliersAfter=14`, `adaptiveSourceContamination=0`, `resizedForegroundRed=0`, and the existing favicon visibility metrics passing.
  - Confirmed named surface checks pass for `assets/adaptive-icon.png`, `assets/splash-icon.png`, `assets/icon.png`, `public/logo-mark.png`, `teleba/public/logo-mark.png`, `teleba/app/apple-icon.png`, and `teleba/public/apple-icon.png`.
  - Ran `npm exec -- tsc --noEmit` in `Zesha-App` successfully.
  - Ran `npm exec -- next build` in `teleba` successfully.
- Lessons learned:
  - Metallic lettermarks can have intentional smooth shading, but abrupt local surface outliers need their own pixel test; contamination checks alone are not enough.
  - Run surface checks after final resize/composition for every metallic-lettermark output, not only on the source-clean foreground.
  - Surface repairs should use real neighboring pixels instead of independent RGB medians so the repair cannot invent new red or matte colors.

### 2026-06-10 - App icon background lost curved depth

- Status: Resolved
- Area: Assets / UI / Validation
- Symptoms: The regenerated app icon looked too flat compared with the original logo. The old icon had a smoother curved red surface and visible rounded depth even in small app chrome, while the new icon background read as a plain solid red tile. A first depth pass added faint circular ring overlays, but the user clarified they wanted curved depth only, not visible ring graphics.
- Root cause: `scripts/generate_logo_assets.py` rendered app-style tile backgrounds with a single flat `BRAND_RED` fill. That preserved the corrected red color but removed the previous subtle highlight, edge falloff, and inset curvature cues. The first dimensional pass overcorrected by adding explicit ellipse outlines instead of relying only on soft light/depth gradients.
- Solution implemented:
  - Added dimensional red tile generation for app-style logo surfaces using `#9A0E1F` as the base, a soft `#C0152A` highlight, and a deeper `#5B0611` edge falloff.
  - Added subtle rounded inset/edge accents to restore the curved tile feel without changing the approved TB/T3 lettermark shape.
  - Removed the explicit circular ring overlay from the app-icon generator so the background keeps smooth curved depth without visible decorative circles.
  - Kept flat favicon outputs on the simpler tile treatment for small-size legibility.
  - Regenerated paired Zesha and Teleba assets with `scripts/generate_logo_assets.py`.
- Validation:
  - Generator completed successfully with `foregroundRedAfter=0`, `edgeDarkMatteAfter=0`, `alphaScratchAfter=0`, `adaptiveSourceContamination=0`, and `resizedForegroundRed=0`.
  - Visually reviewed regenerated `assets/icon.png`, `public/logo-mark.png`, `assets/favicon.png`, and Teleba `public/logo-mark.png`.
  - Ran `npm exec -- tsc --noEmit` in `Zesha-App` successfully.
  - Ran `npm exec -- next build` in `teleba` successfully.
- Lessons learned:
  - Preserving brand color is not enough for app icons; tile surface treatment, curvature, and subtle dimensional cues are part of the recognizable mark.
  - Curved depth should come from broad gradients, highlights, and falloff; visible circular rings are a separate graphic motif and should not be added unless requested.
  - Keep favicon simplification separate from app/logo icon rendering so small-size clarity does not flatten richer app surfaces.

### 2026-06-10 - Web sidebar logo still used stale public asset

- Status: Resolved
- Area: Assets / UI / Validation
- Symptoms: The web app sidebar/header still showed the old logo color after the generated icon assets were regenerated and the splash/app icon red was corrected. After switching to the generated import, the icon did not load in the browser until the import was normalized.
- Root cause: `app/(app)/_layout.web.tsx` hard-coded three app chrome logo images to `/teleba_icon_final.png`. That legacy public PNG is not regenerated by `scripts/generate_logo_assets.py`, so it drifted from the current app icon and kept the old visual treatment. The first replacement passed the raw PNG import directly to DOM `<img src>`, but Expo web asset imports can resolve as asset objects at runtime rather than plain strings.
- Solution implemented:
  - Imported `../../assets/icon.png` as the canonical generated app icon in the web layout.
  - Added the same asset URL normalization pattern used by other web brand components.
  - Replaced the mobile slide-out menu, desktop sidebar, and mobile header logo `src` values with the normalized generated asset URL.
  - Increased the app chrome logo render sizes, added a gold outline/glow around the icon containers, and changed the visible `Teleba` brand labels to corresponding gold tones.
- Validation:
  - Confirmed `teleba_icon_final` has no remaining references in `Zesha-App` source.
  - Ran `npm exec -- tsc --noEmit` in `Zesha-App` successfully.
  - Confirmed `app/(app)/_layout.web.tsx` has no editor diagnostics.
  - Confirmed `styles/web.css` has no editor diagnostics after the sidebar/mobile header styling update.
- Lessons learned:
  - App chrome logo slots can live outside splash/auth/favicon paths; search for legacy public filenames after brand asset changes.
  - Prefer generated asset imports over one-off public PNG filenames for in-app brand chrome so regeneration updates every visible surface.
  - For DOM `<img>` usage in Expo web, normalize imported assets to a string URL before passing them to `src`.
  - Brand chrome needs its own visual review after asset swaps; a technically correct icon can still read too small or disconnected without matching outline and text color.

### 2026-06-10 - Splash mark was undersized and icon tile red drifted too dark

- Status: Resolved
- Area: Assets / UI / Validation
- Symptoms: After switching the splash to the transparent metallic mark, the visible TB/T3 mark looked too small on the splash screen. The regenerated app/logo tile red also looked darker than the app background and no longer matched the previous logo red treatment.
- Root cause: The splash components still rendered the full transparent 1024px splash canvas at the old 140px app-icon size, so the actual visible lettermark was much smaller than before. The generator's `BRAND_RED` had drifted to `#6A010B`, which was darker than the established app brand red used across the theme and adaptive icon background.
- Solution implemented:
  - Restored the generator tile red to `#9A0E1F` via `BRAND_RED = (154, 14, 31, 255)`.
  - Regenerated paired Zesha and Teleba logo/icon/favicon outputs with `scripts/generate_logo_assets.py`.
  - Increased native and web animated splash icon render boxes from 140px to 220px and enlarged the halo so the transparent metallic mark reads at the intended visual scale.
- Validation:
  - Generator completed successfully with `foregroundRedAfter=0`, `edgeDarkMatteAfter=0`, `alphaScratchAfter=0`, `adaptiveSourceContamination=0`, and `resizedForegroundRed=0`.
  - Visually reviewed regenerated `assets/icon.png`, `assets/splash-icon.png`, and Teleba `public/logo-mark.png`.
  - Sampled `assets/icon.png` at a central tile pixel and confirmed it is `(154, 14, 31, 255)` / `#9A0E1F`.
  - Ran `npm exec -- tsc --noEmit` in `Zesha-App` successfully.
  - Ran `npm exec -- next build` in `teleba` successfully.
- Lessons learned:
  - Transparent splash canvases need a larger render box than full-tile app icons because the visible mark occupies only part of the canvas.
  - Keep generated tile red aligned with the app's established brand red, not with an isolated dark favicon or splash background color.

### 2026-06-10 - Splash screen asset needed to be decoupled from favicon work

- Status: Resolved
- Area: Assets / Validation
- Symptoms: The user clarified that the splash screen should continue to use the metallic icon treatment, not the flatter favicon/browser icon treatment. After `app.json` and `assets/splash-icon.png` were corrected, the visible startup screen still showed the red-tile app icon on native and web startup surfaces.
- Root cause: The app has multiple splash layers: Expo's native splash from `app.json`, the React Native-rendered `components/AnimatedSplash.tsx`, and the platform-specific web component `components/AnimatedSplash.web.tsx`. The native component still hard-coded `require("../assets/icon.png")`, and the web component still hard-coded `<img src="/icon.png">`, so the visible splash ignored the dedicated splash asset on both platform paths.
- Solution implemented:
  - Added a dedicated metallic splash asset at `assets/splash-icon.png` in the paired generator.
  - Updated `app.json` so `expo.splash.image` points to `./assets/splash-icon.png` instead of the generic shared icon path.
  - Updated `components/AnimatedSplash.tsx` so the in-app animated splash also renders `../assets/splash-icon.png`.
  - Updated `components/AnimatedSplash.web.tsx` so the web animated splash imports `../assets/splash-icon.png` instead of loading the public `/icon.png` app/browser icon route.
- Validation:
  - Regenerated assets with `scripts/generate_logo_assets.py`, which wrote `assets/splash-icon.png` successfully and kept all contamination checks at zero.
  - Visually confirmed `assets/splash-icon.png` is metallic while `assets/favicon.png` remains the flatter browser variant.
  - Ran `npm exec -- tsc --noEmit` in `Zesha-App` successfully.
  - Confirmed `components/AnimatedSplash.web.tsx` has no editor diagnostics after the web-specific asset import change.
- Lessons learned:
  - Splash screens should have a dedicated asset path when favicon/browser icons intentionally diverge in style.
  - Check every splash layer. Native splash config, React Native splash components, and `.web.tsx` platform overrides can each use different assets.
  - Shared icon filenames make future asset changes ambiguous; separate the surfaces at the config level.

### 2026-06-10 - Lettermark scratches came from dark matte pixels and alpha gaps

- Status: Resolved
- Area: Assets / Validation
- Symptoms: The TB/T3 lettermark still showed contamination after red/pink cleanup: a dark rim near the top bar, black/brown scratch lines under the letter edges, and thin red scratches in the flat favicon where the red tile showed through.
- Root cause: The foreground source had two additional defect classes that were not covered by the earlier predicates: near-black/dark brown matte pixels around RGB `42-44, 12-13, 0`, and zero-alpha scratch gaps inside the intended lettermark mask. The color cleanup removed visible matte pixels, but transparent gaps still let the red background show through in composed icons and favicons.
- Solution implemented:
  - Expanded the generator's dark matte predicate to catch the near-black/brown scratch class.
  - Added an iterative alpha-scratch repair pass that fills small transparent gaps inside the foreground mask from nearby valid gold pixels without filling the large open counters in the B.
  - Regenerated the paired Zesha and Teleba icon outputs from the repaired foreground source.
- Validation:
  - Generator reported `foregroundRedBefore=0`, `foregroundRedAfter=0`, `edgeDarkMatteAfter=0`, `alphaScratchAfter=0`, `adaptiveSourceContamination=0`, and `resizedForegroundRed=0`.
  - A separate dark-pixel probe dropped from 774 candidates to 5 remaining bronze-shadow tones.
  - Visual review confirmed the rich mark and flat favicon no longer show the red rim or scratch bands, including the 16/32/48/64px favicon preview.
  - Ran `npm exec -- tsc --noEmit` in `Zesha-App` successfully.
  - Ran `npm exec -- next build` in `teleba` successfully.
- Lessons learned:
  - Lettermark contamination can be color pixels or mask holes; both need explicit checks.
  - A flat favicon derived from the source alpha mask will expose tiny transparent scratches more clearly than the metallic version, so validate both rich and flat outputs.
  - Threshold boundaries matter. A lower bound of `45` missed the actual dark scratch colors at `42-44`.

### 2026-06-10 - Browser favicon color pass briefly changed the logo mark

- Status: Resolved
- Area: Assets / Validation / Task Execution
- Symptoms: Browser tabs showed the gold-on-red Teleba/Zesha favicon as a muddy, unclear mark at small sizes. During the favicon legibility pass, the browser favicon was incorrectly changed to a simplified single `T`, even though the intended change was color/style only while preserving the original TB/T3 silhouette.
- Root cause: The favicon optimization treated small-size legibility as permission to alter the lettermark shape. That violated the user's intent to keep the logo and only adjust the gold treatment. The durable generator also lived only in a temp folder, and an attempted repo save initially created duplicate hyphenated and underscored script filenames before the duplicate was removed.
- Solution implemented:
  - Added `scripts/generate_logo_assets.py` as the stable paired asset generator for Zesha and Teleba.
  - Kept the richer cleaned foreground for app icons, logo marks, adaptive icons, and apple touch icons.
  - Restored browser favicons to the original cleaned TB/T3 foreground silhouette and changed only the favicon color/style to a flat lighter gold on the brand red tile.
  - Removed the accidental duplicate `scripts/generate-logo-assets.py` path and documented the stable generator path in the Logo Designer agent.
  - Bumped Teleba's icon cache version so browsers request the new tab icon.
- Validation:
  - The generator reported `adaptiveSourceContamination=0`, `resizedForegroundRed=0`, `flat16ForegroundPixels=39`, and `flat32ForegroundPixels=172` after restoring the original silhouette.
  - Visual review confirmed the browser favicon keeps the TB/T3 silhouette while using flat lighter gold for better tab-size contrast.
- Lessons learned:
  - Favicon legibility is a separate design problem from app-icon fidelity, but color/style changes must not alter the source logo silhouette unless the user explicitly approves that tradeoff.
  - Keep durable asset generators under `scripts/` and point agents at that stable path so future fixes do not depend on temp files.
  - Avoid creating near-duplicate script names during asset workflow cleanup; pick one canonical path before validation.

### 2026-06-10 - Paired favicon foreground retained red and pink matte contamination

- Status: Resolved
- Area: Assets / Validation / Task Execution
- Symptoms: Zesha favicons and shared Teleba/Zesha icon exports still showed red or pink contamination around the gold T3 foreground, especially along the top edge and in small browser favicon renders.
- Root cause: The extracted foreground source contained several contamination classes: dark tile-red pixels, bright red edge pixels, rose/pink matte pixels, salmon highlight pixels, and peach matte pixels. Early cleanup predicates only removed some of them. Resizing also exposed edge colors that were less obvious at source size. A PowerShell/GDI+ per-pixel repair attempt was too slow for practical use and had to be abandoned.
- Solution implemented:
  - Rebuilt the paired Pillow generator to repair the transparent foreground source before compositing any red tile background.
  - Added separate cleanup predicates for dark tile-red, bright red, rose matte, salmon matte, and peach matte pixels while preserving bronze/gold shadow tones.
  - Regenerated the Zesha adaptive foreground, Zesha app/public favicon and icon assets, and matching Teleba public/app/apple icon assets in one paired pass.
  - Preserved the original rounded tile geometry for logo-mark outputs and used full-canvas exports for browser favicon surfaces.
- Validation:
  - Pixel validation reported `adaptiveSourceContamination=0` and `highConfidenceRed=0` for all regenerated Zesha and Teleba PNG outputs.
  - Visually reviewed `assets/adaptive-icon.png`, `assets/favicon.png`, `public/icon.png`, and Teleba `public/icon.png` after regeneration.
  - Ran `npm exec -- tsc --noEmit` in `Zesha-App` successfully.
  - Ran `npm exec -- next build` in `teleba` successfully.
- Lessons learned:
  - Logo cleanup needs source-size foreground validation and resized-output validation; one alone can miss edge contamination.
  - Matte contamination is not only dark red. Pink, rose, salmon, and peach pixels can be just as visible on transparent foreground exports and favicons.
  - Keep Zesha and Teleba icon replacement as one release set so shared brand assets do not drift.

### 2026-06-10 - Favicon lettermark contained red background holes

- Status: Monitoring
- Area: Assets / Validation / Task Execution
- Symptoms: The gold T3 lettermark in the generated favicon showed red patches inside the mark, making parts of the letterform look incomplete against the red tile.
- Root cause: The raster generation pipeline did not run an internal lettermark contamination check after compositing. Red/background matte pixels could remain inside the expected gold foreground mask, and broad color cleanup or offset redraw attempts can also erase dark gold/shadow pixels and reveal the red background through the mark.
- Solution implemented:
  - Updated the Logo Designer custom agent with a required post-generation lettermark contamination test.
  - The test compares the final raster against a clean foreground mask and fails exports with red/background-colored or transparent interior pixels inside the mark.
- Validation: Re-read the Logo Designer agent instructions and confirmed the workflow now requires contamination checks at source size and downscaled favicon sizes.
- Lessons learned:
  - Favicon validation must include foreground-integrity checks, not just bounds, color samples, and visual preview.
  - Metallic or textured marks need mask-based validation because red cleanup thresholds can mistake dark gold/shadow detail for background and punch visible holes.

### 2026-06-10 - Browser favicon rendered too small with mismatched red

- Status: Resolved
- Area: UI / Assets
- Symptoms: The browser tab favicon for Teleba/Zesha appeared too small and visually off-shade compared with the app icon, even though the source icon looked acceptable at large preview sizes.
- Root cause: Browser-facing favicon PNGs were generated from an app icon canvas that still had transparent outer padding. At tab size, the browser compressed the already-inset tile, making the red mark look smaller and less consistent. A PowerShell/.NET path-resolution trap also briefly made resize output target the wrong relative base when using `System.IO.Path.GetFullPath` after `Set-Location`.
- Solution implemented:
  - Regenerated `Zesha-App` browser favicon assets from the visible cropped tile so `public/icon.png`, `public/favicon.png`, and `assets/favicon.png` fill their favicon canvas while keeping the same `#6A010B` red.
  - Updated Expo web config in `app.json` to use `./assets/favicon.png` for `expo.web.favicon` so Zesha web no longer serves the padded app icon as the tab favicon.
  - Replaced Teleba's browser icon slots from the corrected Zesha favicon source so `teleba/public/icon.png`, `teleba/app/icon.png`, `teleba/app/apple-icon.png`, and `teleba/public/apple-icon.png` share the same scale and red.
  - Used absolute paths for final Teleba asset writes to avoid .NET resolving targets from the stale process directory.
- Validation: Pixel-bound checks confirmed the corrected browser icons fill their canvases and sample `#6A010B`; visual previews confirmed the favicon mark is no longer tiny.
- Lessons learned:
  - Favicon files need their own canvas treatment; do not reuse app-icon padding for browser tab assets.
  - When generating binary assets from PowerShell/.NET, use absolute output paths and validate pixel bounds after writing.

### 2026-06-10 - Auth lettermark recovery experiments overwrote preview assets

- Status: Monitoring
- Area: UI / Auth / Assets
- Symptoms: `assets/auth-lettermark.png` regressed from a readable transparent logo mark into a broken solid-red render, and `assets/auth-lettermark.svg` was overwritten with an unusable giant filtered-path dump.
- Root cause: While trying to remove the red matte fringe from the auth lettermark, experimental raster/vector recovery steps overwrote the working preview assets instead of writing to disposable intermediates first.
- Solution implemented:
  - Restored `assets/auth-lettermark.png` to a usable cropped render derived from `assets/adaptive-icon.png`.
  - Replaced the corrupted `assets/auth-lettermark.svg` with a minimal wrapper that previews the restored PNG instead of broken path data.
  - Kept the live web auth panel on `assets/adaptive-icon.png` so the broken preview files do not affect the running auth screen.
- Validation: Opened the restored `assets/auth-lettermark.png` in the editor, confirmed `assets/auth-lettermark.svg` is now a valid small wrapper file, and rechecked editor diagnostics for the current auth panel/CSS files.
- Lessons learned:
  - Asset recovery experiments should always write to temp files until the visual result is confirmed.
  - When a preview asset is only experimental and not yet wired into the app, keep the live component pointed at the known-good asset until the replacement is clean.

### 2026-06-09 - Web auth brand header showed boxed app icon instead of blended lettermark

- Status: Resolved
- Area: UI / Auth
- Symptoms: The web sign-in and related auth screens showed the full app icon tile above the form, which made the brand header feel like a second app background sitting on top of the auth page instead of a logo mark blended into the page background.
- Root cause: `components/AuthBrandPanel.web.tsx` rendered `assets/icon.png`, which includes the app tile background, and the shared auth CSS added a strong icon-style presentation rather than a background-blended lettermark treatment.
- Solution implemented:
  - Switched the shared web auth brand wrapper to use `assets/adaptive-icon.png`, which carries only the transparent lettermark.
  - Added a dedicated `.auth-lettermark-image` style so the lettermark uses reduced opacity and blend/shadow treatment against the red auth background instead of reading like a boxed app icon.
- Validation: `get_errors` reported no issues in `components/AuthBrandPanel.web.tsx` and `styles/web.css`, and `npm exec -- tsc --noEmit` completed cleanly in `Zesha-App` after the change.
- Lessons learned:
  - Shared auth wrappers should render transparent brand marks, not full app icons, when the screen already provides its own branded background.
  - If a logo is meant to sit inside a branded backdrop, the asset choice and blend styling matter as much as the image itself.

### 2026-05-30 - Android Sentry mobile replay could ANR on foreground resume

- Status: Resolved
- Area: Build / Navigation
- Symptoms: Production Android sessions on low-end devices (itel P10004L, dist:6) could hit an `ApplicationNotResponding` fatal shortly after returning to the app from the background on `/transactions`. The stack never entered app screen code; it blocked on the main thread inside `io.sentry.android.replay.ReplayIntegration.resumeInternal` and `AndroidConnectionStatusProvider.getConnectionStatus` during lifecycle foreground start.
- Root cause: `config/sentry.ts` enabled `Sentry.mobileReplayIntegration()` unconditionally for native Android. On low-end Android devices, Sentry's replay resume path could block the main thread while reacquiring its connection-status cache lock during app foreground lifecycle events, causing an ANR before the transactions screen could resume normally.
- Solution implemented:
  - Disabled Sentry mobile replay on Android by gating `Sentry.mobileReplayIntegration()` behind `Platform.OS !== "android"`.
  - Set Android replay sampling to `0` so the native replay lifecycle path is not activated on Android while leaving navigation tracing, feedback, and non-replay crash reporting intact.
- Validation: `get_errors` reported no errors in `config/sentry.ts`, `npm exec -- tsc --noEmit` completed cleanly in `Zesha-App`, and the final `config/sentry.ts` readback confirmed Android now skips the replay integration and replay sample rates.
- Lessons learned:
  - If an ANR stack is entirely inside Sentry/SDK lifecycle code, treat the observability integration as a likely root cause before debugging screen components.
  - Mobile replay is optional; on low-end Android devices it is not worth keeping enabled if it risks blocking app foreground resume.
  - Route tags on an ANR can reflect the last active screen even when the freeze happens in process-lifecycle startup code, so stack ownership matters more than the route label.

### 2026-05-29 - Auth recovery handler re-entered loop on sign-in (dist:6 regression)

- Status: Resolved
- Area: Navigation / Auth
- Symptoms: `Maximum update depth exceeded` on `/sign-in` in production (dist:6), reproducible on low-end Android devices (itel P10004L). Sentry stack pointed into `@react-navigation/core/useSyncState.js` `batchUpdates` during `commitHookEffectListMount` — a layout-effect update loop triggered on sign-in screen mount.
- Root cause: Two compounding bugs in the `registerAuthRecoveryHandler` effect in the native root layout:
  1. `router` was included in the effect deps. Because `router` (from `useRouter()`) changes reference on every navigation state change, the effect cleanup ran on every navigation event — resetting `authRecoveryInProgressRef.current = false` and defeating the re-entry guard.
  2. The `finally` block called `router.replace("/(auth)/sign-in")` unconditionally, even when already on the sign-in page. That navigation event changed the `router` reference, triggering cleanup (bug 1), allowing the next 401 from a stale sync-queue request to retrigger the handler and fire another replace — creating the loop.
- Solution implemented:
  - Added a `pathnameRef` (updated on every render via a dep-less `useEffect`) so the handler can read the current pathname without capturing a stale closure.
  - Guarded the `finally` block: `router.replace("/(auth)/sign-in")` is now skipped when `pathnameRef.current` already contains an auth-page path.
  - Removed `router` from the `registerAuthRecoveryHandler` effect deps, consistent with the existing comment on the auth navigation effect, so cleanup no longer resets the guard on every navigation event.
- Validation: No TypeScript errors on the edited file.
- Lessons learned:
  - Any `useEffect` that registers a callback containing a `router.replace` call must NOT include `router` in its deps — the reference changes on every navigation event, causing cleanup and guard-reset churn.
  - `router.replace(X)` called from screen X still fires a navigation event in Expo Router. Always guard navigation calls with a pathname check to avoid self-replace loops.
  - Re-entry guards (`useRef` flags) are only effective if the effect cleanup that resets them is scoped to meaningful dep changes (not stable-but-changing refs like `router`).

### 2026-05-27 - Native auth layout could loop redirects on the sign-in screen

- Status: Resolved (partial — regression introduced in dist:6, see entry above)
- Area: Navigation / Auth
- Symptoms: Production Android sessions could hit `Maximum update depth exceeded` on the sign-in route. Sentry stacks pointed into React Navigation store updates during mount, consistent with repeated navigation state updates.
- Root cause: The native root layout decided whether the user was already on an auth screen primarily from `useSegments()`. On sign-in and related auth routes, that detection was not defensive enough, so the auth gate could repeatedly call `router.replace("/(auth)/sign-in")` or bounce away from auth pages during route-state churn, creating a navigation update loop.
- Solution implemented:
  - Switched the native auth gate to derive auth-page status from `usePathname()` for sign-in, sign-up, welcome, forgot-password, and set-password routes.
  - Used that pathname-based auth-page guard to suppress self-redirects back to sign-in and only redirect signed-in users away from auth pages when appropriate.
- Validation: Ran editor diagnostics on the edited native layout with no errors and `npm exec -- tsc --noEmit` in `Zesha-App` completed cleanly after the redirect-guard change.
- Lessons learned:
  - Route-group metadata is not a robust sole source of truth for redirect guards on auth screens.
  - Redirect effects should always guard against targeting the route that is already active.

### 2026-05-26 - Dashboard commission donut hid all but the current shift

- Status: Resolved
- Area: UI / State
- Symptoms: The dashboard commission donut and total could drop to a single account even when the same dashboard showed many transactions across several accounts for the selected day. Browser network traces showed `/expected-commissions/breakdown` returning only one account because the request included `shift=PM`.
- Root cause: `useDashboardScreen` sent `currentShift` to the expected-commission totals and breakdown endpoints, but the dashboard UI presents "Today", "Last 7 Days", and similar whole-period filters and does not expose an AM/PM selector. The commission widgets were therefore filtered to the current shift while the adjacent transaction widgets were not.
- Solution implemented:
  - Removed the implicit shift filter from dashboard commission totals and breakdown requests.
  - Kept the dashboard commission charts aligned with the selected date range instead of the current clock shift.
- Validation: Confirmed the dashboard hook no longer appends `shift` to the commission aggregate requests and ran diagnostics on the edited frontend file with no errors.
- Lessons learned:
  - If a dashboard card represents a whole selected period, its backend query must not apply a hidden narrower filter.
  - Network traces are the fastest way to distinguish "wrong aggregation" from "wrong filter" when chart totals look inconsistent.

### 2026-05-25 - Sync engine could send secure requests without a bearer token

- Status: Resolved
- Area: Sync / Auth
- Symptoms: A queued transaction on the mobile transactions screen stalled with `header.authorization: Field required` and surfaced as a failed transaction instead of an auth recovery path. The UI looked signed in, but the sync request reached the backend without an `Authorization` header.
- Root cause: `initializeSecureApi(getToken)` only registered Clerk's token getter, and `isSecureApiInitialized()` only checked whether that getter existed. `secureApiRequest` and `secureRequest` still sent requests when `getToken()` returned `null` or token retrieval failed, so the client crossed the network boundary without a bearer token. The sync engine then only saw the backend's response and could at best reclassify it after the fact.
- Solution implemented:
  - Changed `secureApiRequest` and `secureRequest` to fail closed instead of sending tokenless requests.
  - Added one immediate retry when Clerk token retrieval returns `null` or throws, so a brief token-fetch wobble does not immediately force sign-out.
  - Introduced a global auth recovery handler in `services/secureApi.ts` so any `401` or `AUTH_TOKEN_UNAVAILABLE` from the secure API layer routes through the same sign-out and redirect flow, not just sync-queue failures.
  - Removed the manual transaction-screen sign-in actions so expired sessions redirect automatically instead of asking the user what to do.
- Validation: Re-read the edited auth client, native root layout, web root layout, and sync engine control flow and ran diagnostics on those files with no errors.
- Lessons learned:
  - "Secure API initialized" is not the same as "a usable bearer token exists for this request".
  - Authenticated clients should fail closed at the request boundary; they should never silently downgrade to unauthenticated network calls.
  - Queue recovery logic should classify auth failures, but session-expiry recovery should live at the shared API boundary so foreground requests and queued requests behave the same way.

### 2026-05-24 - Agency account schedule UI hid template schedules and misresolved detail

- Status: Resolved
- Area: UI / State
- Symptoms: Agency admins could only assign company-owned commission schedules from the account screens even though the backend allowed system template schedules too. Accounts already linked to a template schedule also risked loading commission detail through the company-only fetch path.
- Root cause: Agency account hooks and web selectors only loaded `commissionSchedules.items`, which excludes system templates. The detail loader also assumed company ownership on the first fetch attempt instead of supporting the backend's template route.
- Solution implemented:
  - Load commission template schedules alongside company schedules in agency account flows.
  - Combine both schedule lists for agency account selectors and display labels.
  - Make schedule detail fetching fall back to the template endpoint when the company-scoped lookup does not own the schedule.
  - Update shared commission rule typing so template rules can carry `companyId = null` safely in frontend state.
- Validation: Ran `npm exec -- tsc --noEmit` successfully and checked diagnostics on the touched frontend files.
- Lessons learned:
  - If the backend allows system templates in tenant flows, the frontend options list and detail fetch path must both model that mixed ownership case.
  - Company schedule summaries and template schedule details are different data shapes, so mixed-source selectors need an explicit resolution strategy.

### 2026-05-24 - Template rule editor treated slot changes as duplicate adds

- Status: Resolved
- Area: UI / State
- Symptoms: Editing a commission template rule from the account detail screen failed with `An active rule already exists for this (transaction_type, transaction_subtype)` even when the user intended to replace the existing withdraw or deposit rule with a new structure. In some cases the same conflict also appeared right after creating and linking a genuinely new schedule.
- Root cause: The rule editor always dispatched the add-rule thunk. The backend correctly allows only one active rule per `(transaction_type, transaction_subtype)` within a schedule and expects the existing slot to be revised instead. Company schedules already had a revise thunk, but template schedules did not, so the template path dead-ended on the duplicate-rule guard. Separately, the duplicate pre-check trusted `selectedSchedule` in Redux even when it was stale and no longer matched the account's currently linked schedule, so a newly created schedule could inherit a false duplicate conflict from previously selected state.
- Solution implemented:
  - Added `reviseCommissionTemplateRule` to the commission schedule slice.
  - Updated the account detail rule form to detect an existing active rule for the selected transaction slot.
  - Automatically dispatch the revise thunk instead of the add thunk when the user is replacing an existing active rule.
  - Scoped duplicate/revise checks to the currently linked schedule ID instead of any stale `selectedSchedule` state.
  - Cleared stale selected schedule detail when creating and linking a brand-new schedule.
  - Return a success message of `Rule revised.` so the UI reflects what actually happened.
- Validation: Ran `npm exec -- tsc --noEmit` successfully and checked diagnostics on the touched frontend files.
- Lessons learned:
  - The UI should model the backend invariant of one active rule per transaction slot instead of surfacing the raw duplicate-rule conflict to the user.
  - Template and company schedule paths need the same mutation surface; missing one side creates confusing parity bugs.
  - If a form can represent both create and replace semantics, detect the existing slot locally and choose the correct mutation before making the API call.
  - Any duplicate pre-check in Redux must be scoped to the exact schedule currently being edited, not whichever schedule detail was last selected.

### 2026-05-24 - Account template slice split left stale selectors and template typing

- Status: Resolved
- Area: UI / State
- Symptoms: The frontend refactor that split template logic out of `accountsSlice` left the app in an inconsistent state. Template consumers still read from `state.accounts`, the new reducer was not registered in the store, and the web accounts screen typed the inherit source as `Account`, causing the TypeScript build to fail.
- Root cause: The slice separation landed in stages, but the follow-up rewiring across store registration, screen hooks, and the inheritance UI was incomplete. That left selectors and imports pointed at the old slice boundary, and one inheritance path still used the company-account type instead of `AccountTemplate`.
- Solution implemented:
  - Added `accountTemplates` to the Redux store.
  - Moved template imports and selectors in the account hooks and onboarding flow to `accountTemplatesSlice`.
  - Kept inherited company accounts syncing back into `accountsSlice` via the `inheritAccountTemplate.fulfilled` case.
  - Updated the web accounts screen so the selected inheritance source is typed as `AccountTemplate`.
- Validation: Ran `npm exec -- tsc --noEmit` successfully and checked diagnostics on all touched frontend files with the error tool.
- Lessons learned:
  - When splitting a Redux domain, finish the store registration and all consumer rewires before treating the first slice extraction as complete.
  - Template entities and company accounts may look structurally similar, but the UI state that carries them across slice boundaries needs explicit types.
  - A quick grep for old selectors after a slice move is a cheap way to catch stale state paths before they become follow-up breakages.

### 2026-05-22 - Blocked sync queue stayed stalled when auth recovered without a backend resync

- Status: Resolved
- Area: Sync / Auth
- Symptoms: Sentry still reported `Sync stalled: transaction blocked (HTTP 401)` on the mobile transactions screen after the user signed in again. The offline queue remained blocked even though a recovery path had already been added for re-authentication.
- Root cause: The earlier recovery only dispatched `resetBlockedItems()` after `syncUserWithBackend` fulfilled. In some re-auth flows, Clerk auth became valid again while the existing backend user already matched the same Clerk user, so `useClerkUserSync` skipped `syncUserWithBackend` entirely. That left blocked queue items in `blocked` forever because no recovery action fired in the already-synced path.
- Solution implemented:
  - Added a shared `resumeBlockedQueue` path in the native and web Clerk sync hooks.
  - Kept the existing unblock-on-success behavior after `syncUserWithBackend` fulfills.
  - Delayed updating `syncedClerkIdRef` until `syncUserWithBackend` actually fulfills, so a transient backend sync failure does not suppress later retry attempts for the same Clerk user.
  - Added recovery for the case where auth becomes available again and the backend user is already synced for the same Clerk user, so blocked items are reset to `pending` and `triggerSync()` runs immediately.
- Validation: TypeScript error checks passed for the updated native and web Clerk sync hooks. Reviewed the restored-auth control flow to confirm recovery now runs both after a fresh backend sync and after an already-synced session becomes available again.
- Lessons learned:
  - Do not couple queue recovery only to the backend sync thunk when auth state can also be restored from cached user state.
  - Any re-auth recovery must cover both "freshly resynced" and "already restored" authenticated states.
  - Do not mark a Clerk user as synced before the backend sync thunk succeeds, or a rejected sync can permanently short-circuit future retries.

### 2026-05-21 - Sync 422 diagnostics hid the missing transaction field

- Status: Resolved
- Area: Sync / Networking
- Symptoms: Offline transaction sync stalled on `POST /transactions/create` with HTTP 422. The queue UI and Sentry only showed `Field required`, which made it impossible to tell which request field was missing. The item was marked `failed` after a single attempt and blocked later queued items.
- Root cause: The backend already returned structured FastAPI validation details with `loc`, `msg`, and `type`, but `secureApiRequest` flattened array errors down to `msg` only. That discarded the field path, so both the in-app queue diagnostics and Sentry lost the actionable part of the 422.
- Solution implemented:
  - Updated `secureApiRequest` to format validation errors as `body.field_name: message` instead of only `message`.
  - Stored the raw validation detail on `ApiError` for richer downstream diagnostics.
  - Added the flattened sync error text to Sentry `syncItem` context so replay events retain the field-level failure detail.
  - Added a sanitized `requestPayload` Sentry context for sync stalls so failed offline mutations expose the outgoing body, body size, and local image count without logging base64 image blobs.
- Validation: TypeScript error check passed for the touched frontend file. Reviewed the backend validation handler and confirmed it already returns `loc`, so the missing detail was lost only in the frontend formatter.
- Lessons learned:
  - For FastAPI 422s, never discard `loc`; `msg` alone is too generic to debug queue failures.
  - Queue-head failures need field-level diagnostics because a single deterministic 4xx blocks later items by design.
  - A pending row can look valid in the UI while still hiding the exact malformed field, so preserve server validation structure in logs.
  - Capture request payloads at the sync boundary instead of enabling global request-body logging on the server; that keeps diagnostics targeted and avoids broad PII exposure.

### 2026-05-20 - Blocked sync items never retried after re-authentication

- Status: Resolved
- Area: Sync / Auth
- Symptoms: Sentry event `Sync stalled: transaction blocked (HTTP 401)` for route `/transactions`. After the user signed back in, the queued transaction was still not synced. Sentry tag `sync.status: blocked`.
- Root cause: `processItem` in `syncEngine.ts` marks items `"blocked"` on 401/403. `isProcessableItem` excludes `"blocked"` status, so blocked items are never retried. There was no code to reset blocked items to `"pending"` after a successful re-authentication — the `useClerkUserSync` hook called `syncUserWithBackend` but did nothing with its result.
- Solution implemented:
  - Added `resetBlockedItems` reducer to `syncQueueSlice` that sets all `"blocked"` items back to `"pending"`.
  - In `useClerkUserSync.ts`, after `dispatch(syncUserWithBackend(...))`, checked for `fulfilled` and dispatched `resetBlockedItems()` + called `triggerSync()` so the sync engine immediately processes the recovered items.
- Validation: No TypeScript errors. Logic reviewed — `triggerSync` is a no-op if already processing or offline, so it is safe to call eagerly.
- Lessons learned:
  - Any time a queue item transitions to a terminal-like status (`"blocked"`, `"failed"`), there must be a recovery path that is triggered by the event that resolves the underlying cause (re-auth, manual retry, etc.).
  - Always check what happens to the sync queue _after_ the fix event (sign-in), not just during the failure.
  - `syncUserWithBackend` succeeding is the signal that auth is restored — couple queue unblocking to that, not to connectivity events.

---

### Example

- Status: Resolved
- Area: UI / State
- Symptoms: A controlled amount input removed a trailing decimal while the user was still typing.
- Root cause: The component converted the in-progress string value to a number on every change, so `1000.` was normalized to `1000` during re-render.
- Solution implemented: Store the draft input as a string while editing, convert only when committing, and preserve intermediate values like `""` and `"."`.
- Validation: Verified typing flows on mobile and web, confirmed the displayed value preserves intermediate input states, and ran the relevant frontend error checks.
- Lessons learned: Controlled numeric inputs need explicit support for intermediate string states. Do not coerce user input to a number on every keystroke.
- Notes: If this recurs, inspect the component state shape before changing formatter utilities.

## Incidents
