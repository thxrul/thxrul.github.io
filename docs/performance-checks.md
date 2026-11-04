# Background and repository verification — 4 November 2026

## Current stationary cluster

The repository carousel was subsequently replaced by one stationary set of six 64 × 64 px squircles, arranged three across with 8 px of overlap. It performs no continuous track animation and creates no duplicate cards. Hover still opens the full-description preview; touch opens the dialog. Chromium 151 checks passed at 390 and 1366 px for stationary positions over time, hover/touch, layout switching, no horizontal overflow and no page errors. The older measurements below describe the previous moving version and are retained for historical comparison; they are not measurements of this release.

The interaction blur came from reducing the full-screen dot renderer to 25% resolution and enlarging it on hover. Resolution now stays fixed, with the same canvas displayed at idle and during interaction. The renderer clears only recently disturbed regions and updates spring state only for affected rows; untouched state stays on the GPU. All 9,017 dots remain at 1366 × 768. The original hold response remains.

The repository strip uses one compositor animation. Its expanded hover preview stays stationary while other cards continue moving. Overload switches the strip to 30 small movement steps per second and simplifies decoration, without lowering dot resolution. Offscreen, hidden-tab and modal states pause the carousel.

## Performance measurements

Chromium 151, Playwright, Linux headless software rendering in a 2-vCPU / 8-GiB environment. Each case uses a fresh page, waits for initial typing to finish, warms pointer motion for three seconds, then measures four seconds. Music plays throughout. The previous release shows its stationary project list; the new release shows six repositories, the moving carousel and an expanded hover preview. Rates count animation callbacks, not physical display frames. This is not a physical test on the user's Windows/Ryzen laptop.

| CPU slowdown | Previous field updates/s | New field updates/s | Previous page updates/s | New page updates/s | New field gap p95 |
|---|---:|---:|---:|---:|---:|
| 1× | 58.5 | 35.3 | 60.0 | 58.9 | 50.0 ms |
| 6× | 44.6 | 27.1 | 55.4 | 52.6 | 66.7 ms |
| 20× | 42.0 | 27.7 | 38.2 | 25.1 | 66.6 ms |
| 40× | 34.4 | 20.7 | 15.7 | 10.0 | 83.4 ms |

The new field stays at 100% CSS-pixel resolution in every case (device pixel ratio is capped at 1.5); the old version fell to 25%. Normal page cadence remained close to 60/s, but the sharper field and extra carousel do cost performance in software rendering. Performance is **not identical** to the previous blurred version, and extreme throttling still stutters. These results cannot establish smooth performance on every laptop.

The first 20× run had a transient severe stall (5.8 field / 3.8 page updates/s). An isolated fresh-browser repeat measured the 20× row above. Timings varied substantially between runs; that outlier has not been concealed or treated as a reliable hardware prediction.

Chrome page throttling does not throttle dedicated worker execution. An additional test multiplied both worker animation and message callback execution time by 40, alongside 40× page throttling, music, moving repositories and hover expansion. It measured 22.9 field updates/s, 8.5 page updates/s and 66.8 ms field gap p95. This synthetic workload is not a CPU/GPU emulator.

## Functional checks

- Pixel readback: untouched background pixels remain identical during hover, forced overload and reset; old disturbed regions return exactly to their starting pixels after the pointer leaves.
- Progressive hold concentrates dots; release settles; the worker sleeps at idle; WebGL reports no errors. Context loss restores the visible Canvas2D fallback.
- The carousel moves left to right. Hover expansion remains stationary while the strip moves behind it. Pause, list/grid/carousel switching, dialogs, Escape, keyboard return and mobile touch opening pass.
- Mobile overflow checks at 320, 390 and 768 px. Both themes pass the selected axe WCAG A/AA checks at 320, 390, 768 and 1440 px. Reduced motion defaults to a stationary list.
- GitHub discovery returns six public repositories. Manual descriptions override GitHub descriptions. Fresh cached data avoids repeat requests; a rate-limit response falls back to checked-in projects when no cache exists.
- Music volume remains 20%. Existing theme switching and project descriptions remain functional.

## Repository updates

GitHub's public API supplies repository membership and metadata, with pagination and a 15-minute browser cache. New visits refresh stale data. Entries in `projects.json` override matching repositories' descriptions and presentation. Failed requests retain the last successful cache or the checked-in list. No token is included in client code.

## Icon-only carousel follow-up

Collapsed items are now 64 × 64 px icons. Hover morphs an icon into a panel up to 600 px wide showing the complete description; moving away dismisses it. Other icons continue moving. Desktop hover, pointer handoff/collapse, mobile tapping, both palettes and overflow checks passed. The background renderer is unchanged.

- 1× CPU, music and expanded hover preview: 59.8 page updates/s, 40.8 field updates/s, 33.4 ms field gap p95.
- 40× CPU, music and expanded hover preview: 13.6 page updates/s, 27.1 field updates/s, 66.7 ms field gap p95.

These focused follow-up measurements use the same software-rendering setup and retain the limitations described above.
