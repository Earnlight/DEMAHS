#!/usr/bin/env node
// Regenerates feed.xml from updates.js. Run this (node scripts/generate-feed.js)
// after adding a new entry to updates.js, so the RSS feed stays in sync.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
// `var` (not `const`) so the top-level declaration attaches to the vm context's global object.
const src = fs.readFileSync(path.join(root, 'updates.js'), 'utf8').replace('const SITE_UPDATES', 'var SITE_UPDATES');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const updates = sandbox.SITE_UPDATES || [];

const SITE_URL = 'https://www.demahs.com';
const entries = updates.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function rfc822(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').toUTCString();
}

const items = entries.map(e => {
  const link = e.book
    ? `${SITE_URL}/${e.book}${e.page !== null && e.page !== undefined ? '?page=' + e.page : ''}`
    : `${SITE_URL}/index.html`;
  return [
    '  <item>',
    `    <title>${escapeXml(e.title)}</title>`,
    `    <link>${escapeXml(link)}</link>`,
    `    <guid isPermaLink="false">${escapeXml((e.book || 'site') + '-' + e.date + '-' + e.title)}</guid>`,
    `    <pubDate>${rfc822(e.date)}</pubDate>`,
    `    <description>${escapeXml(e.note)}</description>`,
    '  </item>',
  ].join('\n');
});

const feed = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0">',
  '<channel>',
  '  <title>The DEMAHS — Hamza Earnlight</title>',
  `  <link>${SITE_URL}/index.html</link>`,
  '  <description>Recent updates to the DEMAHS library.</description>',
  '  <language>en-us</language>',
  ...items,
  '</channel>',
  '</rss>',
].join('\n') + '\n';

fs.writeFileSync(path.join(root, 'feed.xml'), feed);
console.log(`wrote feed.xml with ${items.length} item(s)`);
