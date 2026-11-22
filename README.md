# thxrul.github.io

## Editing project descriptions on GitHub

Edit [`projects.json`](projects.json), then commit the change to `main`. The site reads this file each visit; **you do not need to run a build** when changing project text.

Each project has a `description` array. Each quoted string becomes one paragraph in its expanded dialog:

```json
"description": [
  "Your opening paragraph.",
  "Another paragraph with more details."
]
```

You can also edit `name`, `language`, `symbol`, `status` (optional), and the GitHub `url`. Keep the `id` stable. Use normal JSON syntax: double quotes, commas between entries, and no trailing comma after the final entry. Descriptions are rendered as plain text, not HTML. A multiline string with `\n\n` between paragraphs also works.

The site no longer fetches or replaces descriptions from the GitHub repositories API. If the JSON file cannot load or contains invalid data, the last bundled copy remains available. Allow GitHub Pages to finish deploying after an edit, then reload the page.

The original static project links remain available if JavaScript is disabled.

## Project dialogs

The project section preserves **Motion Primitives, Morphing Dialog Basic Two**'s compact-card-to-dialog interaction and spring (stiffness 200, damping 24). It uses the browser's native modal dialog and compositor animations instead of shipping React and an animation runtime. Shared title, subtitle, and symbol elements morph between the card and a scrollable panel. Escape, outside click, focus trapping/return, reduced motion, and background inertness are supported.

Reference: https://github.com/ibelick/motion-primitives/tree/main/app/docs/morphing-dialog

The upstream reference license is retained in [`src/MOTION-PRIMITIVES-LICENSE`](src/MOTION-PRIMITIVES-LICENSE).

## Changing dialog code

```sh
npm ci
npm run build
```

Commit the changed source and the resulting `assets/projects.js`. Project descriptions still load directly from `projects.json` and need no build.

## Performance

The static dot field is cached. An OffscreenCanvas worker runs WebGL2 transform feedback, keeping individual spring positions and velocities on the GPU and rendering off the main thread. The GPU canvas stays stationary in viewport coordinates and sleeps after settling; it does not run while scrolling, hidden, or behind a dialog. The equalizer draws in the same worker at up to 30 updates/second only while visible and playing; waveform energy is sampled separately. Pointer decorations share cached geometry and one frame callback. The native SVG cursor moves independently of JavaScript load. Dot raster resolution stays fixed (device pixel ratio capped at 1.5), including under overload. The GPU canvas retains its native-resolution image at idle and during interaction; only recently disturbed regions are cleared and repainted. Overload simplifies decorative effects while retaining sharpness, the full dot count and original hold physics. Section reveals use transforms and opacity without animated blurs. The dialog module loads only as the project section approaches the viewport.

## Pointer, typing, and hidden theme

The dot grid uses `24 / sqrt(5)` CSS-pixel spacing (five times the previous area density). Hover repels and blooms dots; a short click sends an outward ripple inspired by [Carter Ogunsola’s Polka Dots](https://carterogunsola.com/lab/polka-dots). Holding retains the original gentle pull and gradually concentrates it after 250 ms with the same 2.5-second buildup. The stationary interaction canvas follows display refresh using elapsed-time GPU spring steps (with a Canvas2D capability/context-loss fallback) and sleeps when settled. Text uses short, staggered transform springs with reduced-motion support.

The sticky header is half its former expanded height (94 px desktop, 140 px mobile). It smoothly collapses into a 5 px strip on downward scroll as navigation text shrinks, slides and fades. Returning to the top, scrolling upward or keyboard-focusing a link restores it, without shifting the page. The animations toggle stays in the bottom-left corner. Both music modes start at 20% volume. Browser autoplay permissions still apply; the first gesture can unlock playback.

Type `tuffestcolor` on the page (outside a dialog or editable control) to toggle the secret theme. A 720 ms circular reveal spreads from the last pointer position (viewport center before any pointer interaction). Reduced motion or browsers without View Transitions switch instantly. It changes colors and surface effects without changing layout: opaque pastel-black surfaces, pink accents, and `media/tuffestcolor.mp3` instead of the regular audio. The smaller soft-dot cursor has a white outline normally and a pink outline in this theme; qualification paths, nodes and statuses also turn pink. Typing the code again restores the original theme. The uploaded music lives outside `audio/` so the normal library index will not include it. The alternate track is fetched only after activation and loops. Replace that file to change its music; the regular playlist still comes from `audio/library.json`.

Detailed measurements and limitations: [performance checks](docs/performance-checks.md).

Complete reusable specification: [website recreation prompt](docs/website-recreation-prompt.md).


## Liquid repository blobs

Projects default to a field of large liquid blobs that drift around on their own with slow, organic motion and softly push each other apart. Each blob keeps breathing its outline, and hovering simply swells it in place into the same organic shape, only larger, while neighbours slide away. Leaving the blob returns it to its resting size. Clicking or tapping opens the existing detailed dialog. The icon control cycles between blobs, list and grid, remembering the selection. Keyboard focus exposes a stationary text list, reduced motion stops the drift and morph animation, and the field pauses while off screen, hidden, or behind a dialog.

Public repositories load automatically from GitHub, with pagination and a 15-minute browser cache. New visits refresh stale data. `projects.json` remains the place to override descriptions and presentation for repositories with matching IDs. New repositories use their GitHub description and language automatically. A failed or rate-limited request keeps the last cached repository list; without a cache, the checked-in projects remain available. No GitHub token is shipped to visitors.
