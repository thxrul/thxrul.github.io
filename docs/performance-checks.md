# Dot field performance checks

The requested fivefold-density field now runs in an OffscreenCanvas worker using WebGL2 transform feedback. Individual dot springs stay on the GPU. The static background is cached. The GPU canvas stays stationary in viewport coordinates, avoiding per-frame page style changes and asynchronous patch-boundary jumps. It draws only during interaction and settling. The audio equalizer also draws in the worker. The soft-dot cursor uses the browser's native SVG cursor support, so cursor movement does not depend on JavaScript frame timing.

## Test setup

Chromium 151.0.7922.173, Playwright 1.62.1, Linux headless browser, 1366 × 768 viewport. Music was playing. Each CPU case used a new page, three seconds of moving-pointer warmup, then four seconds of measured movement. Page CPU throttling used Chrome DevTools Protocol. Field rate comes from the worker's own clock and draw counter; main-page rate comes from page requestAnimationFrame. These measure browser update loops, not a physical display capture.

| Main-thread CPU slowdown | Field updates/sec | Main-page updates/sec | Field frame-gap p95 | Main long tasks (>50 ms) | Linear raster scale |
|---|---:|---:|---:|---:|---:|
| 1× | 59.6 | 60.2 | 16.7 ms | 0 | 70% |
| 6× | 58.3 | 60.0 | 16.8 ms | 0 | 70% |
| 20× | 60.0 | 59.2 | 16.7 ms | 0 | 34% |
| 40× | 59.3 | 32.8 | 16.7 ms | 6 | 25% |

Normal and 6× page updates stayed around 60/sec. The extreme 40× case recorded 59.3 field updates/sec and 32.8 page updates/sec. These results do not guarantee 60 fps for the whole website on every laptop and are not a physical test on the user's Windows/Ryzen system.

Chromium's page CPU throttle does not throttle dedicated workers. An additional stress case therefore multiplied the measured execution time of **both worker animation and message callbacks by 40**, while also applying 40× page throttling and playing music. It recorded **54.4 field updates/sec** with **33.3 ms p95 frame gaps**; the main page recorded 35.3 updates/sec. This busy-wait workload is a conservative synthetic stress test, not a CPU-frequency or GPU-performance emulator.

## Adaptation and limits

Every test retained **9,017 dots**, corresponding to five times the former grid's area density. Under sustained overload, linear raster resolution can fall to 25% and decorative blur, spotlights and idle flourishes are reduced. Dot count, world positions, sensitivity and progressive hold math stay unchanged. The table reports the raster scale selected in each test. The early CPU-only fivefold-density implementation fell to about 7.4 updates/sec at 20× and 3.2 at 40×, which prompted the worker/GPU redesign.

WebGL2 or worker failures restore the compatible Canvas2D renderer. That fallback has less headroom than the accelerated path. Reduced motion and the corner animation toggle remain available. Worker and page animation loops stop after effects settle, while scrolling, in hidden tabs, and behind project dialogs. Audio drawing stops when paused or offscreen.

## Functional verification

- A rendered-pixel test at quarter resolution checked subpixel continuity: no four-CSS-pixel jumps or disappearing dots across the sampled pixel boundaries. Tiny unresolved dots use brightness-preserving interpolation.
- Progressive hold and release checked against GPU particle-state readback; no WebGL errors. The original 250 ms delay, 2.5-second concentration buildup and spring response remain.
- Both GPU and main-page animation loops checked for idle sleep after clicks and released holds.
- GPU context loss checked for recovery without interrupting music.
- Equalizer sensitivity groups checked for differing audio-driven levels; both audio modes start at 20% volume.
- Hidden theme checked for the uploaded audio, opaque pastel-black surfaces, pink accents, and unchanged layout geometry. Repeating the phrase restores the original mode.
- Normal and alternate themes audited at 320, 390, 768 and 1440 px, with no detected WCAG A/AA axe violations or horizontal page overflow in those checks.
- All project dialogs checked for editable JSON descriptions, long content, keyboard focus, Escape, outside click, reduced motion, and static links without JavaScript.

The alternate MP3 matches the supplied file byte-for-byte and is loaded only after the secret theme is activated.
