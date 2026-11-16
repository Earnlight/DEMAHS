# Immersive reader pilot

The illuminated-manuscript reader is enabled only on `advice.html`, the existing reader with the most chapter text (10 paragraphs, 4,114 characters). Every other chapter keeps its existing presentation. The catalogue contains metadata for the existing 33 chapters so navigation and collection search retain the original library order and routes.

The implementation uses the existing static GitHub Pages deployment, artwork and local fonts. Original chapter nodes move into the new interface; chapter text is not duplicated into a runtime dataset. All 38 HTML documents, their original scripts, content, links and metadata remain identical to revision `4042953` after stripping the three added asset hooks on Advice.

Shared assets are `assets/scripts/immersive-reader-bootstrap.js`, `assets/scripts/immersive-reader.js`, `assets/styles/immersive-reader.css` and `assets/reader-catalog.json`. The bootstrap protects existing reading records before legacy scripts initialise. New notes, highlights, bookmarks, appearance and position records use `demahs.reader.*.v1` local storage keys; legacy bookmarks and highlights are imported without deleting their original records. The reader exposes `window.DemahsReader` and reading-position events for a future narration integration, without generating audio or simulated timings.

Verification covered source preservation, all catalogue routes/assets, Advice at desktop/tablet/phone widths, notes, cross-paragraph highlights, named bookmarks, actual scroll progress/resume, persistent appearance settings, chapter/collection search, dictionary UI against an intercepted response, fullscreen and keyboard focus. No test submitted a real comment. The full isolated demo additionally passed WebKit/PWA checks; physical Home Screen testing remains outstanding.

The original reference image was not supplied; the design follows the written brief with existing celestial artwork. Discussion and associated original links remain available through About & discussion, retaining their original destinations. The service worker uses a new cache version and includes the new assets so installed readers can update.

Publishing this pilot is explicitly authorised. Extending the design to other chapters awaits the user's assessment of Advice.
