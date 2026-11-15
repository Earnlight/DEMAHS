# DEMAHS redesign handoff

The redesign keeps the existing static GitHub Pages architecture and all 38 original URLs. It introduces a shared celestial visual system, a reference-inspired illustrated homepage, parchment reading surfaces, local fonts, responsive navigation, persistent light/dark appearance, and a keyboard-accessible global search. No backend, build system, paid service, runtime framework, or package installation is required.

## Audit and content preservation

The audit was completed before edits against commit `7f9a5c040e6821138d06dc25863093ff77aa5f77`: 53 tracked files, 38 HTML pages, 33 paginated chapter readers, three continuous frontmatter manuscripts, a homepage and a library. A complete original text/metadata/link/control/script inventory was saved during implementation in `/workspace/demahs-audit/original-inventory.json`. This workspace artifact is not required for deployment; the automated preservation check reads the original Git revision directly.

All original paragraphs, headings, descriptions, links, metadata, form fields, storage keys, deep-link URLs and chapter text are retained. All 143 original inline scripts and original inline styles are unchanged. The homepage adds the exact hero copy requested in the brief; its previous welcome/acronym/about content remains below the illustrated navigation. Its original title remains the page's single H1. Existing incomplete/placeholder writing and `INPUT` SEO descriptions were deliberately preserved, not rewritten.

Unchanged data and deployment files include `updates.js`, `feed.xml`, `manifest.json`, `sitemap.xml`, `robots.txt`, `CNAME`, `.nojekyll`, all original icons and `scripts/generate-feed.js`.

### Page inventory

- Homepage: `index.html`.
- Complete catalogue, chapter search, saved searches, updates, social/contact links and support links: `library.html`.
- Frontmatter: `introduction.html`, `foreword.html`, `authors-notes.html`.

| Original library section | Existing chapter URLs |
| --- | --- |
| Foundations | [light-as-meaning.html](light-as-meaning.html), [how-to-build-your-light.html](how-to-build-your-light.html), [purity.html](purity.html), [reality.html](reality.html), [the-unseen.html](the-unseen.html), [gravitation.html](gravitation.html), [the-continuum.html](the-continuum.html) |
| The Person | [the-nature-of-life.html](the-nature-of-life.html), [our-heart.html](our-heart.html), [our-mind.html](our-mind.html), [thoughts.html](thoughts.html), [the-conscience.html](the-conscience.html), [age-vs-evolution.html](age-vs-evolution.html) |
| Knowledge | [reading.html](reading.html), [understanding.html](understanding.html), [reason.html](reason.html), [truth.html](truth.html), [belief.html](belief.html), [delusion.html](delusion.html) |
| Expression | [the-pen.html](the-pen.html), [imagination.html](imagination.html), [advice.html](advice.html), [pleasure.html](pleasure.html) |
| Character | [honour.html](honour.html), [morality.html](morality.html), [weakness.html](weakness.html), [weight.html](weight.html) |
| Power & Order | [power.html](power.html), [greatness.html](greatness.html), [hierarchy.html](hierarchy.html) |
| Destiny | [the-finality.html](the-finality.html), [paradise.html](paradise.html), [hellfire.html](hellfire.html) |

### Existing functionality retained

- Chapter auto-pagination, page-turn animation, page jump controls, URL page links and reading resume.
- Persistent chapter text size, reading progress, bookmarks with names and legacy bookmark migration.
- Persistent text highlights, highlighting by selection or paragraph, copy/share and dictionary lookup.
- Fullscreen reading, keyboard navigation, touch/swipe controls, recent in-reader searches and result navigation.
- The original full-library text search, result pagination and saved result management.
- Formspree comment submission, public-sharing consent and per-browser daily limits; optional approved comments rendering.
- Recent updates, chapter latest-addition feeds, RSS generation, external social/support/email destinations and the optional public visit counter.
- PWA manifest and offline caching of all original pages.

## Design and implementation

`assets/styles/realm.css` is the shared theme loaded after the original styles. It supplies design tokens, licensed local Cinzel and Cormorant Garamond faces, parchment and dusk palettes, the panoramic homepage, illustrated cards, responsive layouts, focus treatments, restrained animation and reduced-motion/print support. The cards link to real content: The Library, Foundations, The Person and Destiny.

`assets/scripts/appearance.js` applies `data-appearance` before paint. This uses a new `demahs-appearance` preference so it does not overwrite the original reader's data or depend on its legacy `data-theme` setting. `assets/scripts/realm.js` renders the shared header/footer, accessible native dropdowns, mobile navigation, a native search dialog with focus restoration, and frontmatter text-size controls. Global search indexes the actual chapter sources on demand, so there is no generated search index to become stale. All old storage records keep their original names and formats.

All pages have a main landmark, skip navigation and a single H1; reader cover titles and manuscript text remain unchanged. The header adapts at 960px and cards stack at 700px. New ornamental effects use CSS/SVG; reduced motion disables animations without leaving content hidden. Native cross-document view transitions progressively enhance supported browsers.

The six artwork files are locally hosted WebP assets (about 813 KB total), including a smaller panorama for phones. Below-hero card images have fixed dimensions, lazy loading and asynchronous decoding. Headline/body fonts are preloaded and use `font-display: swap`. Font license files are included. Original Google Fonts stylesheet URLs remain in the HTML to preserve existing head links; local font faces keep the site readable when those optional requests are blocked.

`service-worker.js` changes the cache version to `demahs-realm-v1`, retains every original precached URL and adds the new styles, scripts, fonts, artwork and RSS. It remains network-first for fresh edits, caches only successful same-origin GET responses, leaves external integrations/form POSTs alone, and resolves cached deep links by pathname while offline. Homepage registration waits for initial resources to load. Future cache-list changes should use a new cache version.

## Validation

From the repository root, start the static server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

In a second terminal:

```sh
python3 scripts/verify-preservation.py
python3 scripts/smoke-redesign.py
git diff --check
```

The first check uses only Python's standard library and Git. The browser smoke check additionally requires Python Playwright, Node.js and system Chromium; these are already available in the prepared cloud environment. `CHROMIUM_PATH`, `DEMAHS_TEST_URL` and `DEMAHS_SCREENSHOTS` can override their defaults. These are development/test tools, not website dependencies. Screenshots default to `/tmp/demahs-redesign-screenshots`.

Verified in actual headless Chromium:

- All 38 page routes and all local link/asset destinations, plus exact content/metadata/control/script preservation against the original revision.
- Parsing of all 148 JavaScript sources; RSS generation in a temporary copy matches the original feed exactly.
- Every page at desktop 1440×960, tablet 820×1180, mobile 390×844 and narrow-phone 320×740, with no horizontal overflow.
- Homepage artwork, responsive menus, keyboard skip link/dropdowns/Escape, search-dialog focus and pagination, light/dark persistence, original search and saved results.
- Reader navigation/resume, text-size persistence, named bookmarks, persistent highlights, in-reader search/recent searches, fullscreen, and frontmatter size controls.
- Dictionary UI against a mocked API, selection copy using the real browser clipboard, and share-to-clipboard fallback.
- Comment consent, success state and rate limits against an intercepted mock response. No real message was submitted and the public counter was not incremented.
- Offline deep links, local styles/fonts/images, all precached assets and global search. Reduced-motion visibility and image loading.
- No uncaught browser errors. The pre-existing optional `comments.json` 404 is recorded separately.

A local Chromium observation measured homepage LCP at about 216 ms and CLS at 0.0003. This is evidence from a local server, not a public-network/mobile performance benchmark or a promise of production timings. Desktop/mobile screenshots were visually reviewed. Safari, Firefox, physical devices, native OS share sheets and live external service delivery have not been tested.

## Dependencies and outstanding limitations

Runtime additions are vanilla CSS/JavaScript, generated local artwork and local OFL-licensed font files from `@fontsource-variable/cinzel@5.3.0` and `@fontsource-variable/cormorant-garamond@5.3.0`. Their complete licenses are in `assets/fonts`. There are no new external APIs, recurring subscriptions, paid services or runtime package dependencies.

Existing optional integrations retain their exact destinations: Google Fonts, dictionaryapi.dev, Formspree and the public Abacus counter. Tests intercept these requests to avoid external side effects. Live availability/authorization/delivery has not been asserted. The current cloud network policy may block these services; local fonts and the core reading workflow continue to work. The repository does not contain `comments.json`; reader code already tolerates its absence. No approved comments or credentials were invented. Existing placeholder passages, empty chapters, original literal Markdown markers and incomplete SEO descriptions remain exactly as supplied.

## Deployment — only after explicit approval

No changes have been committed, pushed or deployed. To deploy after approval:

1. Review the diff and rerun the checks above.
2. Commit all changed HTML, `service-worker.js` and the complete new `assets` directory together. Keep the existing `CNAME` (`www.demahs.com`) and `.nojekyll`.
3. Publish through the repository's existing GitHub Pages branch/root configuration. No build command, framework migration, environment secrets or server component is needed.
4. Verify the custom domain, representative pages, reader state and new worker installation over HTTPS. Already-open tabs may need a refresh after the worker upgrade. Confirm external integrations separately if required.

Existing page paths and sitemap URLs are unchanged; no redirects or SEO URL migration are needed. This work does not change Pages settings or DNS.

## Complete changed-file list

The original HTML changes are shared presentation hooks/landmarks (plus the redesigned homepage and library section anchors). Functional scripts embedded in those pages were retained verbatim.

- `REDESIGN.md`
- `advice.html`
- `age-vs-evolution.html`
- `assets/fonts/cinzel-LICENSE.txt`
- `assets/fonts/cinzel-latin-wght-normal.woff2`
- `assets/fonts/cormorant-garamond-LICENSE.txt`
- `assets/fonts/cormorant-garamond-latin-wght-italic.woff2`
- `assets/fonts/cormorant-garamond-latin-wght-normal.woff2`
- `assets/images/card-destiny.webp`
- `assets/images/card-foundations.webp`
- `assets/images/card-library.webp`
- `assets/images/card-person.webp`
- `assets/images/celestial-realm-medium.webp`
- `assets/images/celestial-realm.webp`
- `assets/scripts/appearance.js`
- `assets/scripts/realm.js`
- `assets/styles/realm.css`
- `authors-notes.html`
- `belief.html`
- `delusion.html`
- `foreword.html`
- `gravitation.html`
- `greatness.html`
- `hellfire.html`
- `hierarchy.html`
- `honour.html`
- `how-to-build-your-light.html`
- `imagination.html`
- `index.html`
- `introduction.html`
- `library.html`
- `light-as-meaning.html`
- `morality.html`
- `our-heart.html`
- `our-mind.html`
- `paradise.html`
- `pleasure.html`
- `power.html`
- `purity.html`
- `reading.html`
- `reality.html`
- `reason.html`
- `scripts/smoke-redesign.py`
- `scripts/verify-preservation.py`
- `service-worker.js`
- `the-conscience.html`
- `the-continuum.html`
- `the-finality.html`
- `the-nature-of-life.html`
- `the-pen.html`
- `the-unseen.html`
- `thoughts.html`
- `truth.html`
- `understanding.html`
- `weakness.html`
- `weight.html`
