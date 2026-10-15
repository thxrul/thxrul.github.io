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

The full-screen dot field is painted once. An interaction patch of at most 480 × 480 CSS pixels handles pointer motion and sleeps after settling; it does not run while scrolling, hidden, or behind a dialog. The equalizer updates independently at up to 30 draws/second only while visible and playing. Pointer decorations share cached geometry and one frame callback. Section reveals use transforms and opacity without animated blurs. The dialog module loads only as the project section approaches the viewport.
