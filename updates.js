// ══════════════════════════════════════════════════════════════════════════
// SITE UPDATES — powers the "Recent Updates" section on the library page.
//
// This list is maintained by hand (this is a static site with no backend or
// build step, so nothing can detect content changes on its own) — add one
// entry here each time a paragraph, page, or chapter is added or changed,
// newest entry first. index.html reads this file directly and renders it.
//
// Fields per entry:
//   date  — 'YYYY-MM-DD', shown on the card and used to sort newest-first
//   book  — filename of the page the update lives on (e.g. 'light-as-meaning.html'),
//           or null for a site-wide change not tied to one page
//   title — display name shown on the card (usually the chapter/page title)
//   page  — page number inside that book's e-reader to deep-link to (0 = cover);
//           omit or set to null for non-paginated pages (Introduction, Foreword,
//           Author's Notes) or when book is null — the card will just link to
//           the book with no page parameter
//   note  — one short sentence describing what changed
// ══════════════════════════════════════════════════════════════════════════
const SITE_UPDATES = [
  {
    date: '2026-08-13',
    book: 'introduction.html',
    title: 'Introduction, Foreword & Author’s Notes',
    page: null,
    note: 'Rebuilt as standalone manuscript pages, ready for their text.',
  },
  {
    date: '2026-08-13',
    book: 'weight.html',
    title: 'Weight, Hierarchy & Paradise',
    page: 0,
    note: 'Three new chapters added to the library.',
  },
  {
    date: '2026-08-13',
    book: 'how-to-build-your-light.html',
    title: 'How to Build Light',
    page: 0,
    note: 'Chapter renamed from "How to Build Your Light".',
  },
];
