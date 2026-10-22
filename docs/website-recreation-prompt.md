# Complete website recreation prompt

This consolidates the requested website and its final interactions into one reusable prompt. Supply the existing profile image, favicon, regular audio, and uploaded alternate MP3 alongside it.

---

Build and publish Tharul’s responsive personal portfolio at https://thxrul.github.io/ using the repository thxrul/thxrul.github.io. Use a small static HTML/CSS/JavaScript site compatible with GitHub Pages. Preserve the following exact content, links, layout, and behavior.

## Layout and visual design

Use a dark, restrained interface, system UI typography with a monospace fallback, generous spacing, thin borders, and a maximum content width of 1120 px. Default colors: background #111113, main text #eeeeea, muted text #b0b0aa, subtle white borders. Keep the dot matrix visible directly on the background. Apply a subtle translucent dark tint and approximately 4 px frosted blur only to boxes and controls. No page-wide frosted layer or ambient glow. Give every box consistent text-aware padding, rounded corners, a visible border, and a pointer-following spotlight confined to its border.

Use a sticky navigation bar with the thxrul_ wordmark and links to Qualifications, GitHub, Twitter, and YouTube. Place the small music player and track title beneath the navigation. Make the expanded header half the former height: 94 px on desktop and 140 px on mobile. On downward scrolling, smoothly fold it into a 5 px strip over 720 ms; shrink, fade and slide the wordmark, navigation text (including Qualifications, Twitter and YouTube), and player with it. Restore it at the top, on intentional upward scrolling, or keyboard focus. Use compositor transforms so collapsing never shifts the document layout. Put the “Animations on/off” control in the bottom-left corner and a fixed “Contact” email button in the bottom-right corner. Keep both touch targets at least 44 px and account for mobile safe areas. Contact opens mailto:tharulthathsilu@proton.me.

Add a thin, fixed, 3 px gradient reading-progress indicator at the top edge, driven by scroll position. Links should have a clean 2 px upright light beam that grows upward and follows the horizontal pointer location. Invert the text color only where the beam overlaps it. Include keyboard-focus styling and keep links legible.

## Hero

Create an open hero with no introduction card and no separate Name, Hobbies, or Studying at boxes. On desktop, put a large circular grayscale profile picture on the left and the greeting on the right. Use https://github.com/thxrul.png?size=720 with an accessible alt description and a graceful fallback. The desktop avatar is approximately 240–360 px, scaled responsively. Stack and center these elements on small screens, with an approximately 200–280 px avatar.

Above the greeting, show “A small corner of the internet”. The main greeting is “Hello, I'm Tharul”, displayed on two visual lines: “Hello,” and “I'm Tharul”. Make it large (approximately 48–96 px desktop, scaling to the phone width). Type it slowly on first opening, about 115 ms per character, with short, bouncy transform springs as each character appears. Use a blinking hollow rectangular caret, never an underscore. Provide the complete readable heading to assistive technology without announcing each animation frame.

Below it, show exactly: “student at Coventry University, interested in a lot of nerdy shit.” Make Coventry University a link to https://www.coventry.ac.uk/ opening safely in a new tab. Add a small “Keep scrolling” link to Qualifications.

## Sections and content

Use the same slow, bouncy typing treatment for section headings, triggered once as they enter the viewport. Reveal supporting content and cards on scroll with brief springy slide/morph animations using transforms and opacity. Preserve normal reading order and dimensions. Avoid animated blur.

Qualifications: show Cisco Certifications and Degrees / Diplomas in two separate frosted bordered cards, each with a consistent milestone roadmap. Cisco: CCNA — Certified; CCNP — Planned; CCIE — Planned. Degrees: Diploma in Network Engineering — Completed; Higher National Diploma in Network Engineering — In progress; BSc (Hons) Cyber Security — Year 1 — Planned; BSc (Hons) Cyber Security — Year 2 — Planned. Use a horizontal roadmap on wide screens and a vertical timeline on narrower screens. Statuses must be readable as text, with color as additional feedback.

GitHub: heading “GitHub.”, eyebrow “01 / Code & curiosity”, and exactly: “Random hand coded slop or vibe coded slop. I'm not a software dev. I do networking; this is just a hobby.” Link “Explore my GitHub” to https://github.com/thxrul and “View projects” to the Projects section. Do not add “Hobby projects” or “Networking comes first” labels.

Projects: eyebrow “From my GitHub”, heading “Projects.”, and a small icon toggle between vertical list and two-column grid. Default to the vertical list; remember the visitor’s layout preference locally. Use one column on narrow phones even in grid mode. Keep borders and padding consistent for all text lengths.

Use the compact-card-to-expanded-panel interaction inspired by Motion Primitives Morphing Dialog Basic Two: https://motion-primitives.com/docs/morphing-dialog. Each compact project shows its square language symbol, name, language/status and expand indicator. Clicking morphs the symbol, title and metadata into a centered expanded dialog with full paragraphs, a repository link and a close button. Use a native modal dialog with lightweight Web Animations and a spring around stiffness 200/damping 24. Support Escape, outside click, close button, focus trapping, focus return, inert background, long descriptions with internal scrolling, and reduced motion. Preserve existing drag-to-dismiss behavior if working from this repository.

Keep all project descriptions in a manually editable projects.json file. Fetch it on visits without overwriting it with repository API descriptions. Editing and committing JSON through GitHub must update the site without rebuilding the JavaScript bundle. Render descriptions as plain text and fall back to a bundled copy on invalid JSON or fetch failure. Preserve these initial project records:

```json
[
  {
    "id": "curler",
    "name": "curler",
    "language": "Go",
    "symbol": "Go",
    "url": "https://github.com/thxrul/curler",
    "description": [
      "Simple TUI downloader written in GO using cURL. Made for downloading files continuously even if it gets interrupted. Lightweight and easy to compile and configure."
    ]
  },
  {
    "id": "OpenMyau-Plus",
    "name": "OpenMyau-Plus",
    "language": "Java / Fork",
    "symbol": "Jv",
    "status": "Work in progress",
    "url": "https://github.com/thxrul/OpenMyau-Plus",
    "description": [
      "Experimental Minecraft Ghost Client forked from OpenMyau+. Tries to Implement Tenacity UI, remove obsolete modules and improve upon existing ones. Almost entirely coded using assistance of LLMs."
    ]
  },
  {
    "id": "pyDo",
    "name": "pyDo",
    "language": "Python",
    "symbol": "Py",
    "url": "https://github.com/thxrul/pyDo",
    "description": [
      "Extremely simple python script which creates a file to store simple 'to do' esque actions.."
    ]
  },
  {
    "id": "thxrul.github.io",
    "name": "thxrul.github.io",
    "language": "JavaScript",
    "symbol": "JS",
    "url": "https://github.com/thxrul/thxrul.github.io",
    "description": [
      "This website! Almost entirely vibe coded using ChatGPT 6.1 Sol through OpenAI Codex."
    ]
  }
]
```

Twitter: link the large Twitter heading to https://twitter.com/logout. YouTube: link its heading to https://www.youtube.com/watch?v=dQw4w9WgXcQ. Preserve these exact destinations. Add a footer with thxrul and Back to top.

## Dot matrix and cursor

Fill the viewport with a fixed, subtle, evenly spaced dot matrix behind the content. Increase dot density to five times the former 24 px grid’s area density: spacing = 24 / sqrt(5) CSS px (about 10.73 px), giving roughly 9,000 dots at 1366 × 768. Render round dots with gentle brightness and size blooming near interaction.

Use the hover repulsion and outward click ripple behavior of Carter Ogunsola’s Polka Dots (https://carterogunsola.com/lab/polka-dots) as the interaction reference. Keep hover sensitivity modest, with about a 190 px radius. Clicking briefly sends an outward spring wave, approximately 620 px/second, then settles. Do not replace the existing hold behavior with the click ripple.

Preserve the progressive hold formula: after 250 ms, concentration = 1 - exp(-heldSeconds / 2.5). Within the radius, influence = max(0, 1 - distance / 190). Initial held pull = influence² × 0.55; concentrated pull = (1 - exp(-3 × influence)) × 0.88; interpolate between them using concentration. The longer the visitor holds, the more tightly dots gather beneath the mouse or touch. Releasing restores normal hover. Dot locations are not affected by the weight or placement of cards.

Use the same spring feel as before: at 60 Hz, velocity = (velocity + (target - displacement) × 0.075) × 0.76, then advance displacement. Advance using elapsed time so 60 Hz and high-refresh screens retain the same physical response. Use requestAnimationFrame during active motion, with no 30 fps timer that causes hover skipping. Smooth the pointer at the original equivalent rate (0.18 per 60 Hz frame).

Use a native browser SVG cursor on fine mouse pointers so its movement stays independent of JavaScript load. Show a small black dot cursor, approximately 12 px across in a 20 px SVG canvas, with a soft blurred middle, a softly blurred 1 px outline, white normally and pastel pink in the alternate theme and a brief expanding click echo. Do not intercept pointer events. Keep native cursor behavior in modal dialogs and when animations are disabled. Touch users should not see a fake mouse cursor.

## Music and equalizer

Use the existing regular track (audio/ice-zertal.mp3) and generated audio/library.json playlist metadata. Start at 20% volume for both music modes. Attempt autoplay, handle browser restrictions honestly and unlock on the first permitted gesture. Provide an accessible play/pause control and never restart playback after an explicit pause except when the visitor intentionally activates the alternate mode.

Display a radial equalizer around the play button. Drive it from actual audio waveform energy. Give bars different sensitivity multipliers rather than using a single equal frequency value across every bar: [0.45, 1.15, 0.7, 1.65, 0.9, 1.4, 0.55, 1.9], mirrored around 32 radial bars. Keep motion smooth and sufficiently varied even at the quieter playback volume. Move the equalizer canvas drawing into the same OffscreenCanvas worker while sampling waveform energy separately. Do not tie the dot matrix to music energy. Stop equalizer drawing when paused, hidden, offscreen, animations are off, or a project dialog is open.

## Hidden alternate version

When the visitor types tuffestcolor directly on the homepage, without any input field, toggle an alternate theme. Ignore typing inside dialogs or editable controls and ignore modifier shortcuts. Match the phrase locally; do not record or transmit keystrokes. Keep every element’s geometry, content placement and font metrics exactly unchanged.

Replace the blurry/translucent surfaces with opaque pastel black (#29252d), use background #19171b, and replace white secondary accents with pastel pink (#f5b2cf), muted pink #c39dac, and pink borders. Apply this consistently to text, controls, spotlights, dots, equalizer and scroll gradient. Use a pastel-pink cursor outline and pink qualification paths, timeline nodes and status text, with readable status labels. Preserve link inversion, now using the pink beam. When the phrase completes, reveal the new palette with a 720 ms circular ripple starting at the current mouse/touch pointer position; use the viewport center if no pointer position is available. Animate a native View Transition snapshot clip, without a persistent JavaScript animation loop or layout changes. Respect reduced motion and switch instantly if snapshots are unsupported. Apply the same reveal when restoring the original theme.

Switch music to the supplied “Feeling yummy x righteously Ayesha.mp3”, stored as media/tuffestcolor.mp3. Start it quietly and loop it. Fetch this file only after activation. Keep it outside the regular audio library so normal mode never plays it. Typing tuffestcolor again restores the normal theme and regular music. Announce the theme change unobtrusively to assistive technology.

## Accessibility, performance and delivery

Support 320 px phones through wide desktop screens without horizontal page overflow. Maintain readable contrast, semantic headings, keyboard navigation, visible focus, a skip link, accessible controls and modal behavior. Respect prefers-reduced-motion and the explicit animation toggle. Content stays readable when animations are off and project repository links remain available without JavaScript.

Optimize for recent Chromium on Windows 10 LTSC 21H2 with 8 GB RAM and Ryzen 5 3500U. Cache the full static dot field; keep dot springs on the GPU using WebGL2 transform feedback in an OffscreenCanvas worker, with a Canvas2D capability/context-loss fallback; use a stationary GPU canvas in viewport coordinates, with device pixel ratio capped at 1.5 and adaptive raster resolution; the Canvas2D fallback can use a bounded 480 × 480 CSS px patch. Batch canvas paths and pointer decorations, cache geometry and avoid repeated allocation of out-of-radius particles. Stop animation loops entirely once settled, on scrolling, hidden tabs, reduced motion and modal dialogs. Avoid idle animation loops, full-screen main-thread canvas repainting, and per-character animated filters. Lazy-load the small project-dialog module near the Projects section. Keep frosted blur subtle and bounded.

Measure frame budget and adapt raster resolution and decorative blur under sustained overload without lowering dot density or changing hold physics. Stop the worker after settling and while hidden, scrolling, reduced-motion, or modal.

Before publishing, check normal and 6×, 20×, and 40× CPU-throttled Chromium; add a separate synthetic worker workload because Chromium page throttling does not throttle worker execution. Check hover cadence and long tasks, idle sleep, progressive hold/release, short-click ripple, collapsing navigation and pointer-origin theme reveal, mobile widths, both themes’ identical geometry, both audio sources and quiet volume, equalizer sensitivity, keyboard/reduced-motion behavior, all project dialogs and JSON editing. Check for runtime errors and run an accessibility audit. Preserve unrelated changes already made on GitHub, commit the source and built assets, publish to GitHub Pages and verify the live deployment.
