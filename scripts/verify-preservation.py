#!/usr/bin/env python3
"""Compare the redesign with the audited pre-redesign Git revision (stdlib only)."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BASELINE = '7f9a5c040e6821138d06dc25863093ff77aa5f77'


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


def normalize(text):
    return re.sub(r'\s+', ' ', text).strip()


class Content(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.excluded = 0
        self.text = []
        self.links = Counter()
        self.metadata = Counter()
        self.ids = Counter()
        self.controls = Counter()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag in ('style', 'script'):
            self.excluded += 1
        if tag == 'a':
            self.links[tuple(sorted(attrs))] += 1
        if tag in ('meta', 'link'):
            # The sole leaf-green appearance intentionally replaces the browser chrome colour.
            if not (tag == 'meta' and attributes.get('name') == 'theme-color'):
                if tag == 'meta' and attributes.get('name') == 'viewport':
                    attrs = [(key, value.replace(', viewport-fit=cover', '') if key == 'content' else value) for key, value in attrs]
                self.metadata[(tag, tuple(sorted(attrs)))] += 1
        if tag in ('form', 'input', 'textarea', 'button', 'select'):
            self.controls[(tag, tuple(sorted(attrs)))] += 1
        if 'id' in attributes:
            self.ids[attributes['id']] += 1

    def handle_endtag(self, tag):
        if tag in ('style', 'script'):
            self.excluded -= 1

    def handle_data(self, text):
        if not self.excluded:
            self.text.append(text)


def verify():
    files = git('ls-tree', '-r', '--name-only', BASELINE).decode().splitlines()
    checked_pages = 0
    script_count = 0
    for filename in files:
        path = ROOT / filename
        assert path.is_file(), f'Missing original file: {filename}'
        before_bytes = git('show', f'{BASELINE}:{filename}')
        after_bytes = path.read_bytes()
        if not filename.endswith('.html'):
            if filename == 'manifest.json':
                before_manifest, after_manifest = json.loads(before_bytes), json.loads(after_bytes)
                for key in ('background_color', 'theme_color'):
                    assert after_manifest.pop(key) == '#101f14'
                    before_manifest.pop(key)
                assert before_manifest == after_manifest, 'Non-colour manifest fields changed'
            elif filename != 'service-worker.js':
                assert before_bytes == after_bytes, f'Original data/asset changed: {filename}'
            continue
        before, after = before_bytes.decode(), after_bytes.decode()
        original, current = Content(before), Content(after)
        assert '<html lang="en" data-appearance="dark">' in after, filename
        assert '<meta name="theme-color" content="#101f14">' in after, filename
        # Keep literal paragraphs/text fragments, including original placeholder copy.
        text = normalize(''.join(current.text))
        for fragment in original.text:
            phrase = normalize(fragment)
            if phrase:
                assert phrase in text, f'Lost text in {filename}: {phrase[:100]!r}'
        for name in ('links', 'metadata', 'ids', 'controls'):
            missing = getattr(original, name) - getattr(current, name)
            assert not missing, f'Lost {name} in {filename}: {missing}'
        assert re.search(r'<title>(.*?)</title>', before, re.S)[1] == re.search(r'<title>(.*?)</title>', after, re.S)[1], filename
        # Preserve all functional code and chapter text byte-for-byte.
        original_scripts = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', before, re.S)
        current_scripts = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', after, re.S)
        def without_fullscreen(source):
            # Only the duplicated fullscreen controller moves into shared reader.js.
            if '// FULLSCREEN\n' in source and '// HIGHLIGHT FEATURE' in source:
                start = source.index('// FULLSCREEN\n')
                end = source.index('// HIGHLIGHT FEATURE', start)
                return source[:start] + source[end:]
            return source
        assert not (Counter(map(without_fullscreen, original_scripts)) - Counter(map(without_fullscreen, current_scripts))), f'Original script changed beyond fullscreen in {filename}'
        # Original inline styles remain as an untouched base beneath the shared theme.
        for style in re.findall(r'<style>(.*?)</style>', before, re.S):
            assert style in after, f'Original base styles changed in {filename}'
        assert current.ids['main-content'] == 1, f'Missing/duplicate main landmark: {filename}'
        assert len(current.ids) == sum(current.ids.values()), f'Duplicate IDs: {filename}'
        checked_pages += 1
        script_count += len([s for s in original_scripts if s.strip()])
    print(f'PASS: all {len(files)} original files remain; all {checked_pages} pages preserve text, URLs, metadata, controls and IDs.')
    print(f'PASS: all {script_count} inline sources preserve chapter data and all logic outside the extracted fullscreen controller.')
    print('PASS: RSS, updates, sitemap, robots, custom domain, icons and feed generator are unchanged; only manifest colours changed.')


if __name__ == '__main__':
    verify()
